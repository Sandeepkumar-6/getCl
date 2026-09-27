export const PERMISSIONS = Object.freeze({
  POLICYHOLDER: new Set([
    "profile:read", "profile:write", "vehicle:own", "policy:own",
    "claim:own", "document:own", "service:own", "check:own",
    "reminder:own", "notification:own",
  ]),
  SURVEYOR: new Set([
    "profile:read", "profile:write", "claim:assigned", "inspection:assigned",
    "document:assigned", "notification:own",
  ]),
  ADMIN: new Set([
    "profile:read", "profile:write", "claim:operate", "vehicle:read",
    "policy:read", "user:operate", "surveyor:operate", "sla:operate",
    "notification:own", "audit:read",
  ]),
  SUPER_ADMIN: new Set([
    "profile:read", "profile:write", "claim:operate", "vehicle:read",
    "policy:read", "user:operate", "surveyor:operate", "staff:govern",
    "sla:operate", "notification:own", "audit:read", "report:global",
    "config:govern",
  ]),
});

export const hasPermission = (role, permission) =>
  Boolean(PERMISSIONS[role]?.has(permission));

