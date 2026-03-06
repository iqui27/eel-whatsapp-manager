import { NextRequest, NextResponse } from 'next/server';
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
} from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, voters } from '@/db/schema';
import { loadConfig } from '@/lib/db-config';
import { validateSession } from '@/lib/db-auth';
import {
  addSegment,
  deleteSegment,
  loadSegments,
  setSegmentVoters,
  updateSegment,
  updateSegmentCount,
} from '@/lib/db-segments';

type FilterOperator = 'AND' | 'OR';

interface SegmentFilter {
  id?: string;
  key: string;
  value: unknown;
}

interface StoredFilters {
  operator?: FilterOperator;
  filters?: SegmentFilter[];
}

function parseStoredFilters(input: unknown): { operator: FilterOperator; filters: SegmentFilter[] } {
  if (typeof input === 'string') {
    try {
      return parseStoredFilters(JSON.parse(input));
    } catch {
      return { operator: 'AND', filters: [] };
    }
  }

  if (Array.isArray(input)) {
    return { operator: 'AND', filters: input as SegmentFilter[] };
  }

  if (input && typeof input === 'object') {
    const { operator, filters } = input as StoredFilters;
    return {
      operator: operator === 'OR' ? 'OR' : 'AND',
      filters: Array.isArray(filters) ? filters : [],
    };
  }

  return { operator: 'AND', filters: [] };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildCondition(filter: SegmentFilter) {
  switch (filter.key) {
    case 'zone': {
      const values = normalizeStringList(filter.value);
      const value = normalizeString(filter.value);
      if (values.length > 0) return inArray(voters.zone, values);
      if (value) return eq(voters.zone, value);
      return undefined;
    }
    case 'section': {
      const values = normalizeStringList(filter.value);
      const value = normalizeString(filter.value);
      if (values.length > 0) return inArray(voters.section, values);
      if (value) return eq(voters.section, value);
      return undefined;
    }
    case 'city': {
      const values = normalizeStringList(filter.value);
      const value = normalizeString(filter.value);
      if (values.length > 0) return inArray(voters.city, values);
      if (value) return eq(voters.city, value);
      return undefined;
    }
    case 'neighborhood': {
      const values = normalizeStringList(filter.value);
      const value = normalizeString(filter.value);
      if (values.length > 0) {
        return or(...values.map((item) => ilike(voters.neighborhood, `%${item}%`)));
      }
      if (value) return ilike(voters.neighborhood, `%${value}%`);
      return undefined;
    }
    case 'tags': {
      const values = normalizeStringList(filter.value);
      return values.length > 0 ? arrayOverlaps(voters.tags, values) : undefined;
    }
    case 'optInStatus': {
      const value = normalizeString(filter.value);
      return value ? eq(voters.optInStatus, value as 'active' | 'expired' | 'revoked' | 'pending') : undefined;
    }
    case 'engagementScore': {
      if (filter.value && typeof filter.value === 'object' && !Array.isArray(filter.value)) {
        const min = normalizeNumber((filter.value as { min?: unknown }).min);
        const max = normalizeNumber((filter.value as { max?: unknown }).max);
        const conditions = [
          min !== null ? gte(voters.engagementScore, min) : undefined,
          max !== null ? lte(voters.engagementScore, max) : undefined,
        ].filter(Boolean);

        if (conditions.length === 0) return undefined;
        if (conditions.length === 1) return conditions[0];
        return and(conditions[0], conditions[1]);
      }

      const min = normalizeNumber(filter.value);
      return min !== null ? gte(voters.engagementScore, min) : undefined;
    }
    default:
      return undefined;
  }
}

async function previewAudience(rawFilters: unknown) {
  const { operator, filters } = parseStoredFilters(rawFilters);
  const conditions = filters.map(buildCondition).filter(Boolean);
  const whereClause = conditions.length === 0
    ? undefined
    : operator === 'OR'
      ? or(...conditions)
      : and(...conditions);

  const rows = whereClause
    ? await db.select({ id: voters.id }).from(voters).where(whereClause)
    : await db.select({ id: voters.id }).from(voters);

  return {
    count: rows.length,
    voterIds: rows.map((row) => row.id),
  };
}

async function loadFilterOptions() {
  const rows = await db
    .select({
      zone: voters.zone,
      section: voters.section,
      city: voters.city,
      neighborhood: voters.neighborhood,
      tags: voters.tags,
    })
    .from(voters);

  const zones = new Set<string>();
  const sections = new Set<string>();
  const cities = new Set<string>();
  const neighborhoods = new Set<string>();
  const tags = new Set<string>();

  for (const row of rows) {
    if (row.zone) zones.add(row.zone);
    if (row.section) sections.add(row.section);
    if (row.city) cities.add(row.city);
    if (row.neighborhood) neighborhoods.add(row.neighborhood);
    for (const tag of row.tags ?? []) {
      if (tag) tags.add(tag);
    }
  }

  return {
    zones: [...zones].sort(),
    sections: [...sections].sort(),
    cities: [...cities].sort(),
    neighborhoods: [...neighborhoods].sort(),
    tags: [...tags].sort(),
    totalVoters: rows.length,
  };
}

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  if (!await validateSession(token)) {
    return null;
  }
  return await loadConfig();
}

export async function GET(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const requestedId = searchParams.get('id');

    if (action === 'filter-options') {
      const filterOptions = await loadFilterOptions();
      return NextResponse.json(filterOptions);
    }

    const data = await loadSegments();
    const filteredSegments = requestedId
      ? data.filter((segment) => segment.id === requestedId)
      : data;
    const segmentIds = filteredSegments.map((segment) => segment.id);
    const segmentCampaigns = segmentIds.length > 0
      ? await db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          status: campaigns.status,
          segmentId: campaigns.segmentId,
        })
        .from(campaigns)
        .where(inArray(campaigns.segmentId, segmentIds))
        .orderBy(desc(campaigns.createdAt))
      : [];

    const campaignsBySegment = new Map<string, typeof segmentCampaigns>();
    for (const campaign of segmentCampaigns) {
      if (!campaign.segmentId) continue;
      const list = campaignsBySegment.get(campaign.segmentId) ?? [];
      list.push(campaign);
      campaignsBySegment.set(campaign.segmentId, list);
    }

    return NextResponse.json(filteredSegments.map((segment) => ({
      ...segment,
      campaigns: campaignsBySegment.get(segment.id) ?? [],
    })));
  } catch (error) {
    console.error('GET segments error:', error);
    return NextResponse.json({ error: 'Erro ao carregar segmentos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    if (action === 'preview') {
      const preview = await previewAudience(body.filters);
      return NextResponse.json(preview);
    }

    if (!body.name || !body.filters) {
      return NextResponse.json({ error: 'name e filters são obrigatórios' }, { status: 400 });
    }

    const filters = typeof body.filters === 'string' ? body.filters : JSON.stringify(body.filters);
    const preview = await previewAudience(body.filters);
    const segment = await addSegment({
      ...body,
      filters,
      audienceCount: preview.count,
    });
    await setSegmentVoters(segment.id, preview.voterIds);
    await updateSegmentCount(segment.id);

    return NextResponse.json(segment, { status: 201 });
  } catch (error) {
    console.error('POST segments error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar segmento' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const { id, ...updates } = body;
    const preview = updates.filters ? await previewAudience(updates.filters) : null;

    if (updates.filters && typeof updates.filters !== 'string') {
      updates.filters = JSON.stringify(updates.filters);
    }

    if (preview) {
      updates.audienceCount = preview.count;
    }

    const segment = await updateSegment(id, updates);
    if (preview) {
      await setSegmentVoters(id, preview.voterIds);
      await updateSegmentCount(id);
    }

    return NextResponse.json(segment);
  } catch (error) {
    console.error('PUT segments error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar segmento' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = queryId ? null : await request.json().catch(() => null);
    const id = queryId ?? body?.id;
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    await deleteSegment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE segments error:', error);
    return NextResponse.json({ error: 'Erro ao deletar segmento' }, { status: 500 });
  }
}
