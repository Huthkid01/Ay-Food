/** Normalize "pack 1" / "Pack 1" → "Pack 1" for stable grouping + sorting. */
export function normalizePackName(raw?: string | null): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return 'Other items';
  const match = trimmed.match(/^pack\s*(\d+)$/i);
  if (match) return `Pack ${Number(match[1])}`;
  return trimmed;
}

export function packSortKey(name: string): [number, string] {
  const match = name.match(/^pack\s*(\d+)$/i) || name.match(/(\d+)/);
  const num = match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  return [num, name.toLowerCase()];
}

export function comparePackNames(a: string, b: string): number {
  const [na, la] = packSortKey(a);
  const [nb, lb] = packSortKey(b);
  if (na !== nb) return na - nb;
  return la.localeCompare(lb);
}
