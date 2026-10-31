import { AccessControlProvider } from "@refinedev/core";
import { UserProfile } from "./authProvider";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action, params }) => {
    const userStr = localStorage.getItem("user_profile");
    if (!userStr) {
      return { can: false, reason: "Unauthorized" };
    }

    try {
      const user: UserProfile = JSON.parse(userStr);
      const permissions = user.permissions || [];
      const role = user.role || "";

      // 1. Super Admin memiliki hak bypass untuk seluruh aksi
      if (role === "Super Admin") {
        return { can: true };
      }

      // 2. Resource: Dashboard
      if (resource === "dashboard") {
        return { can: true };
      }

      // 3. Resource: Users (Granular Permissions)
      if (resource === "users") {
        if (action === "list" || action === "show") {
          const can = permissions.includes("users.view");
          return { can, reason: can ? undefined : "Perlu permission: users.view" };
        }
        if (action === "create") {
          const can = permissions.includes("users.create");
          return { can, reason: can ? undefined : "Perlu permission: users.create" };
        }
        if (action === "edit") {
          const can = permissions.includes("users.edit");
          return { can, reason: can ? undefined : "Perlu permission: users.edit" };
        }
        if (action === "delete") {
          const can = permissions.includes("users.delete");
          return { can, reason: can ? undefined : "Perlu permission: users.delete" };
        }
      }

      // 4. Resource: Roles (Dynamic Role Management)
      if (resource === "roles") {
        if (action === "list" || action === "show") {
          const can = permissions.includes("roles.view");
          return { can, reason: can ? undefined : "Perlu permission: roles.view" };
        }
        if (action === "create" || action === "edit" || action === "delete") {
          const can = permissions.includes("roles.manage");
          return { can, reason: can ? undefined : "Perlu permission: roles.manage" };
        }
      }

      // 5. Resource: Documents (Granular Permission + ABAC Data Ownership)
      if (resource === "documents") {
        if (action === "list" || action === "show") {
          const can = permissions.includes("documents.view");
          return { can, reason: can ? undefined : "Perlu permission: documents.view" };
        }

        if (action === "create") {
          const can = permissions.includes("documents.create");
          return { can, reason: can ? undefined : "Perlu permission: documents.create" };
        }

        // ABAC Data Ownership Guard untuk Edit Dokumen
        if (action === "edit") {
          if (!permissions.includes("documents.edit")) {
            return { can: false, reason: "Perlu permission: documents.edit" };
          }

          // Cek Kepemilikan Data (Data Ownership)
          if (params?.ownerId && params.ownerId !== user.id) {
            return {
              can: false,
              reason: "ABAC Rule: Anda hanya dapat mengubah dokumen milik Anda sendiri.",
            };
          }
          return { can: true };
        }

        // ABAC Data Ownership Guard untuk Hapus Dokumen
        if (action === "delete") {
          if (!permissions.includes("documents.delete")) {
            return { can: false, reason: "Perlu permission: documents.delete" };
          }

          // Cek Kepemilikan Data (Data Ownership)
          if (params?.ownerId && params.ownerId !== user.id) {
            return {
              can: false,
              reason: "ABAC Rule: Anda hanya dapat menghapus dokumen yang Anda buat sendiri.",
            };
          }
          return { can: true };
        }
      }

      return { can: false, reason: "Forbidden" };
    } catch {
      return { can: false, reason: "Invalid session" };
    }
  },
};
