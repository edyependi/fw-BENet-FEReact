import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider, App as AntdApp } from "antd";
import { ThemeMode, lightTheme, darkTheme, corporateTheme } from "../theme/themeTokens";
import { axiosInstance } from "../api/axiosInstance";
import { useGetIdentity } from "@refinedev/core";
import { UserProfile } from "../providers/authProvider";

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (theme: ThemeMode) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("preferred_theme") as ThemeMode | null;
    return saved && ["Light", "Dark", "Corporate"].includes(saved) ? saved : "Corporate";
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const { data: identity } = useGetIdentity<UserProfile>();

  // Sinkronisasi saat user berhasil login / profile termuat
  useEffect(() => {
    if (identity?.themePreference) {
      const backendTheme = identity.themePreference as ThemeMode;
      if (["Light", "Dark", "Corporate"].includes(backendTheme)) {
        setThemeModeState(backendTheme);
        localStorage.setItem("preferred_theme", backendTheme);
      }
    }
  }, [identity]);

  const setThemeMode = async (newTheme: ThemeMode) => {
    // 1. Optimistic UI update (instan tanpa lag)
    setThemeModeState(newTheme);
    localStorage.setItem("preferred_theme", newTheme);

    // 2. Sinkronisasi dengan database backend jika terautentikasi
    const token = localStorage.getItem("auth_token");
    if (token) {
      setIsSyncing(true);
      try {
        await axiosInstance.patch("/users/me/theme", { themePreference: newTheme });
      } catch (err) {
        console.error("Gagal sinkronisasi preferensi tema ke server:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const getActiveThemeConfig = () => {
    switch (themeMode) {
      case "Light":
        return lightTheme;
      case "Dark":
        return darkTheme;
      case "Corporate":
      default:
        return corporateTheme;
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isLoading: isSyncing }}>
      <ConfigProvider theme={getActiveThemeConfig()}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme harus digunakan di dalam AppThemeProvider");
  }
  return context;
};

