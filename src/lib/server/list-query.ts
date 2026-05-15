export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export function clampTake(value: string | null): number {
  const parsed = Number(value) || DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(parsed, 1), MAX_PAGE_SIZE);
}

export function readOffset(value: string | null): number {
  return Math.max(Number(value) || 0, 0);
}

export function nextOffset(offset: number, itemCount: number, total: number): string | null {
  const next = offset + itemCount;
  return next < total ? String(next) : null;
}

export function containsText(value: string) {
  const databaseUrl = process.env.DATABASE_URL || '';
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    return { contains: value, mode: 'insensitive' };
  }
  return { contains: value };
}
