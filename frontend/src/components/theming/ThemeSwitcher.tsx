import React from "react";
import { Dropdown, Button, Space, Typography } from "antd";
import type { MenuProps } from "antd";
import { 
  SunOutlined, 
  MoonOutlined, 
  BankOutlined, 
  CheckOutlined 
} from "@ant-design/icons";
import { useAppTheme } from "../../contexts/ThemeContext";

export const ThemeSwitcher: React.FC = () => {
  const { themeMode, setThemeMode, isLoading } = useAppTheme();

  const items: MenuProps["items"] = [
    {
      key: "Light",
      label: (
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Space>
            <SunOutlined style={{ color: "#faad14" }} />
            <span>Light (Terang)</span>
          </Space>
          {themeMode === "Light" && <CheckOutlined style={{ color: "#1677ff", marginLeft: 16 }} />}
        </Space>
      ),
      onClick: () => setThemeMode("Light"),
    },
    {
      key: "Dark",
      label: (
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Space>
            <MoonOutlined style={{ color: "#177ddc" }} />
            <span>Dark (Gelap)</span>
          </Space>
          {themeMode === "Dark" && <CheckOutlined style={{ color: "#1677ff", marginLeft: 16 }} />}
        </Space>
      ),
      onClick: () => setThemeMode("Dark"),
    },
    {
      key: "Corporate",
      label: (
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Space>
            <BankOutlined style={{ color: "#003a8c" }} />
            <span>Corporate (Enterprise)</span>
          </Space>
          {themeMode === "Corporate" && <CheckOutlined style={{ color: "#003a8c", marginLeft: 16 }} />}
        </Space>
      ),
      onClick: () => setThemeMode("Corporate"),
    },
  ];

  const getThemeIcon = () => {
    switch (themeMode) {
      case "Light":
        return <SunOutlined style={{ color: "#faad14" }} />;
      case "Dark":
        return <MoonOutlined style={{ color: "#177ddc" }} />;
      case "Corporate":
      default:
        return <BankOutlined style={{ color: "#003a8c" }} />;
    }
  };

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={["click"]}>
      <Button loading={isLoading} type="text">
        <Space>
          {getThemeIcon()}
          <Typography.Text strong>{themeMode}</Typography.Text>
        </Space>
      </Button>
    </Dropdown>
  );
};

