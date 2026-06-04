/**
 * Deterministic HSL color from a user id. Same id always yields the same hue,
 * so a user's editor cursor color matches their sidebar/avatar color.
 */
export function colorFromUserId(id: string): string {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return `hsl(${hash % 360}, 80%, 60%)`
}
