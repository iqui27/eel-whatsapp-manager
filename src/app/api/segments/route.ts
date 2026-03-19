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
import { campaigns, voters, segments } from '@/db/schema';
import { requirePermission } from '@/lib/api-auth';
import {
  addSegment,
  deleteSegment,
  getSegmentByTag,
  getSegmentVoterIds,
  loadSegments,
  setSegmentVoters,
  updateSegment,
  updateSegmentCount,
  validateSegmentTag,
  generateTagFromName,
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

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'campaigns.view', 'Seu operador não pode ver segmentos');
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const requestedId = searchParams.get('id');
    const requestedTag = searchParams.get('tag');

    if (action === 'filter-options') {
      const filterOptions = await loadFilterOptions();
      return NextResponse.json(filterOptions);
    }

    // Support query by tag
    if (requestedTag) {
      const segment = await getSegmentByTag(requestedTag);
      if (!segment) {
        return NextResponse.json({ error: 'Segmento nao encontrado' }, { status: 404 });
      }
      return NextResponse.json(segment);
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
  const auth = await requirePermission(request, 'campaigns.manage', 'Seu operador não pode criar segmentos');
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    if (action === 'preview') {
      const preview = await previewAudience(body.filters);
      return NextResponse.json(preview);
    }

    if (action === 'add-voters') {
      const { segmentId, voterIds } = body as { segmentId?: string; voterIds?: string[] };
      if (!segmentId || !Array.isArray(voterIds)) {
        return NextResponse.json({ error: 'segmentId e voterIds[] são obrigatórios' }, { status: 400 });
      }
      // Merge additively — keep existing + new, deduplicated
      const existing = await getSegmentVoterIds(segmentId);
      const merged = Array.from(new Set([...existing, ...voterIds]));
      await setSegmentVoters(segmentId, merged);
      await updateSegmentCount(segmentId);
      return NextResponse.json({ added: merged.length - existing.length, total: merged.length });
    }

    if (!body.name || !body.filters) {
      return NextResponse.json({ error: 'name e filters são obrigatórios' }, { status: 400 });
    }

    // Handle segmentTag
    let segmentTag = body.segmentTag;
    if (segmentTag) {
      // Validate tag format
      const validation = validateSegmentTag(segmentTag);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      
      // Check for duplicate tag
      const existing = await getSegmentByTag(segmentTag);
      if (existing) {
        return NextResponse.json({ error: 'Ja existe um segmento com esta tag' }, { status: 400 });
      }
    } else if (body.autoGenerateTag !== false) {
      // Auto-generate tag from name if not provided
      const baseTag = generateTagFromName(body.name);
      let finalTag = baseTag;
      let counter = 1;
      
      // Ensure uniqueness
      while (await getSegmentByTag(finalTag)) {
        finalTag = `${baseTag}_${counter}`;
        counter++;
      }
      segmentTag = finalTag;
    }

    const filters = typeof body.filters === 'string' ? body.filters : JSON.stringify(body.filters);
    const preview = await previewAudience(body.filters);
    const segment = await addSegment({
      ...body,
      segmentTag,
      filters,
      audienceCount: preview.count,
    });
    await setSegmentVoters(segment.id, preview.voterIds);
    await updateSegmentCount(segment.id);

    return NextResponse.json(segment, { status: 201 });
  } catch (error) {
    console.error('POST segments error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar segmento';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Seu operador não pode editar segmentos');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const { id, ...updates } = body;

    // Handle segmentTag update
    if (updates.segmentTag !== undefined) {
      // Validate tag format
      const validation = validateSegmentTag(updates.segmentTag);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      
      // Check for duplicate tag (excluding current segment)
      if (updates.segmentTag) {
        const existing = await getSegmentByTag(updates.segmentTag);
        if (existing && existing.id !== id) {
          return NextResponse.json({ error: 'Ja existe um segmento com esta tag' }, { status: 400 });
        }
      }
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar segmento';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Seu operador não pode remover segmentos');
  if (auth.response) return auth.response;

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
