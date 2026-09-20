export const CONSENT_VERSION = 'v1.0';
export const CONSENT_PURPOSES = ['coordination', 'information_sharing'] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export function caseConsentScope(episodeId: string, hospitalId: string | null) {
  return `case:${episodeId}:hospital:${hospitalId ?? 'unassigned'}:${CONSENT_VERSION}`;
}

export function pairConsentScope(pairId: string, consentScopeVersion: number, recipientEpisodeId: string, recipientHospitalId: string | null, donorEpisodeId: string, donorHospitalId: string | null) {
  const canonical = `pair|${pairId}|${consentScopeVersion}|${recipientEpisodeId}|${recipientHospitalId ?? 'unassigned'}|${donorEpisodeId}|${donorHospitalId ?? 'unassigned'}|${CONSENT_VERSION}`;
  return `pair:${createHash('sha256').update(canonical).digest('hex')}`;
}

export function latestConsentState(rows: Array<{ purpose: string; action: string; scope: string }>, scope: string) {
  const state: Record<ConsentPurpose, 'required' | 'granted' | 'withdrawn'> = { coordination: 'required', information_sharing: 'required' };
  for (const row of rows) if (row.scope === scope && row.purpose in state && state[row.purpose as ConsentPurpose] === 'required') state[row.purpose as ConsentPurpose] = row.action === 'grant' ? 'granted' : 'withdrawn';
  return state;
}
import { createHash } from 'node:crypto';
