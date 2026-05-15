export function getNextCursor<T extends { id: string }>(items: T[], take: number): string | null {
  if (items.length <= take) return null;

  items.pop();
  return items.at(-1)?.id ?? null;
}
