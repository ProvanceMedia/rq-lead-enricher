import { Role } from "@prisma/client";

export function canApprove(role: Role): boolean {
  return role === Role.admin || role === Role.operator;
}

export function canManageSettings(role: Role): boolean {
  return role === Role.admin;
}
