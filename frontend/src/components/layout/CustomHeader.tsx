import React from "react";
import { Layout, Space, Avatar, Typography, Button } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { ThemeSwitcher } from "../theming/ThemeSwitcher";
import { UserProfile } from "../../providers/authProvider";

export const CustomHeader: React.FC = () => {
  const { data: user } = useGetIdentity<UserProfile>();
  const { mutate: logout } = useLogout();

  return (
    <Layout.Header
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0 24px",
        height: 64,
        position: "sticky",
        top: 0,
        zIndex: 999,
        background: "transparent",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(140, 140, 140, 0.15)",
      }}
    >
      <Space size="middle">
        <ThemeSwitcher />

        {user && (
          <Space>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#1677ff" }} />
            <Typography.Text strong>{user.username}</Typography.Text>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => logout()}
              title="Logout"
            />
          </Space>
        )}
      </Space>
    </Layout.Header>
  );
};

