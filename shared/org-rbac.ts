/**
 * Organization RBAC catalog (Phase 3).
 * Roles are stored lowercase in Postgres; API may accept either case.
 * Permissions are defined in code (not a DB table yet) for a single source of truth.
 */

export const ORG_ROLES = [
  "owner",
  "admin",
  "operator",
  "reviewer",
  "finance",
  "viewer",
] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

/** Legacy roles still present in older rows — map on read. */
export const LEGACY_ORG_ROLE_MAP: Record<string, OrgRole> = {
  member: "operator",
  administrator: "admin",
};

export const ORG_ROLE_RANK: Record<OrgRole, number> = {
  viewer: 10,
  finance: 20,
  reviewer: 30,
  operator: 40,
  admin: 50,
  owner: 60,
};

export const ORG_PERMISSIONS = [
  "org.manage",
  "org.members.manage",
  "org.billing.manage",
  "org.audit.read",
  "project.create",
  "project.read",
  "project.update",
  "project.delete",
  "agreement.create",
  "agreement.read",
  "agreement.update",
  "agreement.send",
  "rights.read",
  "rights.update",
  "client.manage",
] as const;

export type OrgPermission = (typeof ORG_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<OrgRole, readonly OrgPermission[]> = {
  owner: [...ORG_PERMISSIONS],
  admin: [
    "org.members.manage",
    "org.audit.read",
    "project.create",
    "project.read",
    "project.update",
    "project.delete",
    "agreement.create",
    "agreement.read",
    "agreement.update",
    "agreement.send",
    "rights.read",
    "rights.update",
    "client.manage",
  ],
  operator: [
    "project.create",
    "project.read",
    "project.update",
    "agreement.create",
    "agreement.read",
    "agreement.update",
    "agreement.send",
    "rights.read",
    "rights.update",
    "client.manage",
  ],
  reviewer: ["project.read", "agreement.read", "rights.read"],
  finance: ["org.billing.manage", "project.read", "agreement.read", "org.audit.read"],
  viewer: ["project.read", "agreement.read", "rights.read"],
};

export function normalizeOrgRole(role: string | null | undefined): OrgRole | null {
  if (!role) return null;
  const lower = role.trim().toLowerCase();
  if (LEGACY_ORG_ROLE_MAP[lower]) return LEGACY_ORG_ROLE_MAP[lower];
  if ((ORG_ROLES as readonly string[]).includes(lower)) return lower as OrgRole;
  return null;
}

export function roleAtLeast(role: string | null | undefined, minimum: OrgRole): boolean {
  const normalized = normalizeOrgRole(role);
  if (!normalized) return false;
  return ORG_ROLE_RANK[normalized] >= ORG_ROLE_RANK[minimum];
}

export function roleHasPermission(
  role: string | null | undefined,
  permission: OrgPermission,
): boolean {
  const normalized = normalizeOrgRole(role);
  if (!normalized) return false;
  return ROLE_PERMISSIONS[normalized].includes(permission);
}

export function permissionsForRole(role: string | null | undefined): OrgPermission[] {
  const normalized = normalizeOrgRole(role);
  if (!normalized) return [];
  return [...ROLE_PERMISSIONS[normalized]];
}
