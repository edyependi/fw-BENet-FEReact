import { ThemeConfig, theme } from "antd";

export type ThemeMode = "Light" | "Dark" | "Corporate";

export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: "#1677ff",
    colorBgBase: "#ffffff",
    borderRadius: 6,
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#177ddc",
    colorBgBase: "#141414",
    borderRadius: 6,
  },
};

export const corporateTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: "#003a8c",      // Corporate Deep Navy
    colorInfo: "#08979c",         // Teal Accent
    colorBgBase: "#f8fafc",       // Enterprise Slate Off-White
    colorTextBase: "#0f172a",     // Slate Text
    borderRadius: 4,              // Sharp modern enterprise corners
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
  },
  components: {
    Layout: {
      headerBg: "#002766",        // Navy AppBar
      siderBg: "#001529",
    },
    Menu: {
      darkItemBg: "#001529",
    },
  },
};

