import React from "react";
import { Row, Col, Card, Typography, Tag, Space, Button, Statistic, Table } from "antd";
import { 
  CheckCircleOutlined, 
  SyncOutlined, 
  SafetyCertificateOutlined,
  BgColorsOutlined,
  KeyOutlined,
  ApartmentOutlined
} from "@ant-design/icons";
import { useGetIdentity } from "@refinedev/core";
import { UserProfile } from "../../providers/authProvider";
import { useAppTheme } from "../../contexts/ThemeContext";

export const DashboardPage: React.FC = () => {
  const { data: user } = useGetIdentity<UserProfile>();
  const { themeMode, isLoading } = useAppTheme();

  const dataSource = [
    { key: "1", service: "Dynamic Custom Roles", tech: "Database-Driven (`Roles` & `Permissions` Tables)", status: "Active" },
    { key: "2", service: "Granular RBAC", tech: "11 Fine-Grained Permissions (JWT Claims + Refine Guard)", status: "Enforced" },
    { key: "3", service: "Data Ownership & ABAC", tech: "Attribute-Based Control (Department & Owner ID)", status: "Active" },
    { key: "4", service: "Decoupled Database", tech: ".NET 10 EF Core (SQLite / PostgreSQL Interchangeable)", status: "Connected" },
    { key: "5", service: "Dynamic Theming", tech: "Ant Design ConfigProvider + User Profile Sync", status: "Synchronized" },
  ];

  const columns = [
    { title: "Enterprise Feature", dataIndex: "service", key: "service" },
    { title: "Architecture & Implementation", dataIndex: "tech", key: "tech" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color="cyan" icon={<CheckCircleOutlined />}>
          {status}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: "8px 0" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Enterprise Portal — {user?.department ?? "Executive"}
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Role-Based & Attribute-Based Access Control System with Dynamic Theming.
          </Typography.Paragraph>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable>
              <Statistic
                title="Active Role"
                value={user?.role ?? "Loading..."}
                prefix={<SafetyCertificateOutlined style={{ color: "#1677ff" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable>
              <Statistic
                title="Department Scope"
                value={user?.department ?? "Executive"}
                prefix={<ApartmentOutlined style={{ color: "#52c41a" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable>
              <Statistic
                title="Active Theme"
                value={themeMode}
                prefix={<BgColorsOutlined />}
                suffix={isLoading ? <SyncOutlined spin /> : <CheckCircleOutlined style={{ color: "#52c41a" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable>
              <Statistic
                title="Granted Permissions"
                value={user?.permissions?.length ?? 0}
                prefix={<KeyOutlined style={{ color: "#fa8c16" }} />}
                suffix="Rules"
              />
            </Card>
          </Col>
        </Row>

        <Card title="Current Session Permissions Matrix" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              Kumpulan granular permissions yang disematkan langsung di dalam token JWT user ini:
            </Typography.Text>
            <Space wrap size={[6, 8]}>
              {user?.permissions?.map((perm) => (
                <Tag color="geekblue" key={perm}>
                  <CheckCircleOutlined style={{ marginRight: 4 }} />
                  {perm}
                </Tag>
              ))}
            </Space>
          </Space>
        </Card>

        <Card title="Architecture & Security Capabilities Overview" bordered={false}>
          <Table dataSource={dataSource} columns={columns} pagination={false} size="middle" />
        </Card>

        <Card title="Theme Preset Live Test" bordered={false}>
          <Space direction="vertical" size="middle">
            <Typography.Text>
              Ganti tema dari dropdown header di kanan atas untuk menguji responsivitas tema:
            </Typography.Text>
            <Space wrap>
              <Button type="primary">Primary Button</Button>
              <Button>Default Button</Button>
              <Button type="dashed">Dashed Button</Button>
              <Button type="primary" danger>Danger Action</Button>
            </Space>
          </Space>
        </Card>
      </Space>
    </div>
  );
};
