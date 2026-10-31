import { AuthProvider } from "@refinedev/core";
import { axiosInstance } from "../api/axiosInstance";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  department: string;
  plantId?: string;
  plantName?: string;
  plantCode?: string;
  role: string;
  roles?: string[];
  permissions: string[];
  themePreference: string;
}

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      const response = await axiosInstance.post<{ token: string; user: UserProfile }>("/auth/login", {
        username,
        password,
      });

      const { token, user } = response.data;
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_profile", JSON.stringify(user));

      return {
        success: true,
        redirectTo: "/",
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "Login Error",
          message: error.response?.data?.message || "Username atau password salah.",
        },
      };
    }
  },

  logout: async () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_profile");
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      return {
        authenticated: true,
      };
    }
    return {
      authenticated: false,
      redirectTo: "/login",
      logout: true,
    };
  },

  onError: async (error) => {
    if (error?.status === 401 || error?.statusCode === 401) {
      return { logout: true };
    }
    return { error };
  },

  getIdentity: async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return null;

    try {
      const { data } = await axiosInstance.get<UserProfile>("/users/me");
      localStorage.setItem("user_profile", JSON.stringify(data));
      return data;
    } catch {
      const cached = localStorage.getItem("user_profile");
      return cached ? JSON.parse(cached) : null;
    }
  },

  getPermissions: async () => {
    const userStr = localStorage.getItem("user_profile");
    if (!userStr) return [];
    try {
      const user: UserProfile = JSON.parse(userStr);
      return user.permissions || [];
    } catch {
      return [];
    }
  },
};
