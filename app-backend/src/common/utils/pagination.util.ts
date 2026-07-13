export function buildPaginationMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
  };
}
