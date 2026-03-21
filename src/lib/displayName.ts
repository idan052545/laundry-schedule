/**
 * Returns the appropriate display name based on the current locale.
 * When locale is "en" and nameEn is available, returns nameEn.
 * Otherwise returns the Hebrew name.
 */
export function displayName(
  user: { name: string; nameEn?: string | null },
  locale: string
): string {
  if (locale === "en" && user.nameEn) return user.nameEn;
  return user.name;
}
