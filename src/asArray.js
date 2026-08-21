/**
 * Coerces a CMS asset field into an array.
 *
 * GetComponentData returns these fields (`gallery-images`, `room-images`,
 * `listing-page-image`) in three different shapes:
 *   - a real array, when the field has values
 *   - the key absent entirely, when the field is empty
 *   - the literal STRING "[]", also when the field is empty
 *
 * That third shape is the trap. `value || []` lets it through because a
 * non-empty string is truthy, and then:
 *   - `.filter()` / `.map()` throw  ("images.filter is not a function")
 *   - `.length` silently returns 2, so an EMPTY tab reports two images
 *
 * The second failure is the dangerous one - it corrupts counts without
 * anyone noticing. Seen on RRI1280 and RRI1397's Exterior tab.
 */
export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
