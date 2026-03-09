import { loadCampaigns } from '@/lib/db-campaigns';
import { buildCampaignReport } from '@/lib/reporting';

export async function loadCampaignReport(periodDays: number) {
  const campaigns = await loadCampaigns();
  return buildCampaignReport(campaigns, periodDays);
}
