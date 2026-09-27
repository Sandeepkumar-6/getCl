export function pagination(query, defaultLimit = 25) {
  const number = (value, fallback) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  const page = number(query.page, 1);
  const limit = Math.min(100, number(query.limit, defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export async function paginate(query, request, map = (item) => item) {
  // Existing selectors can keep consuming arrays; collection screens request pages.
  if (request.page === undefined) return (await query.limit(100)).map(map);
  const { page, limit, skip } = pagination(request);
  const [rows, total] = await Promise.all([
    query.skip(skip).limit(limit),
    query.model.countDocuments(query.getFilter()),
  ]);
  return { items: rows.map(map), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}
