export type Role = "reader" | "admin";
export type Access = "read" | "write";

export function isAllowed(role: Role, access: Access): boolean {
    return access === "read" || role === "admin";
}