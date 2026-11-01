export type LegacyInput = {
  sourceId: string;
  pubkey: string;
  platform: string;
  identity: string;
  historicallyVerified?: boolean;
  /** Original evidence date, never an import/observation date. */
  verifiedAt?: string | null;
  method?: string | null;
  proofUrl?: string | null;
};
export type LegacyEvidence = {
  sourceId: string;
  pubkey: string;
  platform: string;
  identity: string;
  state: 'historicallyVerified' | 'claim';
  historicallyVerified: boolean;
  verifiedAt: string | null;
  method: string | null;
  proofUrl: string | null;
};

/** Pure read-only projection of explicitly supplied, sanitized legacy evidence; no database access. */
export function projectLegacyEvidence(input: LegacyInput): LegacyEvidence {
  if (
    !/^[a-f0-9]{64}$/.test(input.pubkey) ||
    !input.sourceId ||
    input.sourceId.length > 256 ||
    !input.platform ||
    input.platform.length > 64 ||
    !input.identity ||
    input.identity.length > 320
  )
    throw new Error('invalid-legacy-evidence');
  let proofUrl: string | null = null;
  try {
    const url = new URL(input.proofUrl ?? '');
    if (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      url.href.length <= 2048
    )
      proofUrl = url.href;
  } catch {
    /* An unsafe/missing legacy URL is not evidence. */
  }
  const historicallyVerified = input.historicallyVerified === true;
  const verifiedAt =
    typeof input.verifiedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(input.verifiedAt) &&
    Number.isFinite(Date.parse(input.verifiedAt))
      ? input.verifiedAt
      : null;
  return {
    sourceId: input.sourceId,
    pubkey: input.pubkey,
    platform: input.platform,
    identity: input.identity,
    state: historicallyVerified ? 'historicallyVerified' : 'claim',
    historicallyVerified,
    verifiedAt,
    method:
      typeof input.method === 'string' ? input.method.slice(0, 128) : null,
    proofUrl,
  };
}
