export interface AuthUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  subscriptionTier?: string;
  role?: string | null;
}

/** Two-letter initials from name, or first letter of email. */
export function getUserInitials(user?: AuthUser | null): string {
  if (!user) return "?";
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.length >= 2 ? first.slice(0, 2).toUpperCase() : first[0].toUpperCase();
  if (user.email) return user.email[0].toUpperCase();
  return "U";
}

export function getUserDisplayName(user?: AuthUser | null): string {
  if (!user) return "My Account";
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first) return `${first} ${last ?? ""}`.trim();
  return user.email ?? "Operator";
}
