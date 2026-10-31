import React from "react";
import { Form, Input, Button, Card, Typography, Alert, Space } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useLogin } from "@refinedev/core";
import { ThemeSwitcher } from "../../components/theming/ThemeSwitcher";

export const LoginPage: React.FC = () => {
  const { mutate: login, isLoading, error } = useLogin();

  const onFinish = (values: any) => {
    login(values);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <ThemeSwitcher />
      </div>

      <Card
        style={{ width: "100%", maxWidth: 420, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%", textAlign: "center", marginBottom: 24 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Enterprise Portal
          </Typography.Title>
          <Typography.Text type="secondary">
            Sign in with .NET 10 JWT & Ant Design Theming
          </Typography.Text>
        </Space>

        {error && (
          <Alert
            message={(error as any)?.message || "Login failed"}
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} initialValues={{ username: "admin", password: "admin123" }}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Masukkan username Anda" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Masukkan password Anda" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="admin123" size="large" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={isLoading}>
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Typography.Paragraph type="secondary" style={{ textAlign: "center", fontSize: 12, marginBottom: 0 }}>
          Default credential: <b>admin</b> / <b>admin123</b>
        </Typography.Paragraph>
      </Card>
    </div>
  );
};

