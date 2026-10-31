import React from "react";
import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Tag, Space, Avatar, Typography, Alert, Card, Badge } from "antd";
import { 
  FileTextOutlined, 
  UserOutlined, 
  SafetyCertificateOutlined, 
  InfoCircleOutlined,
  CheckCircleOutlined 
} from "@ant-design/icons";
import { CanAccess, useGetIdentity } from "@refinedev/core";
import { UserProfile } from "../../providers/authProvider";

interface PlantRef {
  plantId: string;
  plantCode: string;
  plantName: string;
}

interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  department: string;
  classification: string;
  ownerId: string;
  ownerUsername: string;
  plantIds?: string[];
  plants?: PlantRef[];
  createdAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

export const DocumentListPage: React.FC = () => {
  const { tableProps } = useTable<DocumentRecord>({
    syncWithLocation: true,
  });
  const { data: currentUser } = useGetIdentity<UserProfile>();

  const getClassificationTag = (classification: string) => {
    switch (classification?.toLowerCase()) {
      case "confidential":
        return <Tag color="error">Confidential</Tag>;
      case "internal":
        return <Tag color="processing">Internal</Tag>;
      case "public":
      default:
        return <Tag color="success">Public</Tag>;
    }
  };

  return (
    <List
      title="Attribute-Based Access Control"
      headerButtons={() => (
        <CanAccess resource="documents" action="create">
          <CreateButton />
        </CanAccess>
      )}
    >
      <Alert
        message="Demo Data Ownership & ABAC (Attribute-Based Access Control)"
        description={
          <div>
            <p style={{ margin: "4px 0" }}>
              • <b>Super Admin</b>: Dapat melihat dan mengedit semua dokumen di seluruh departemen.
            </p>
            <p style={{ margin: "4px 0" }}>
              • <b>Department Manager</b>: Dapat memonitor dokumen di dalam departemennya.
            </p>
            <p style={{ margin: "4px 0" }}>
              • <b>Staff (Data Ownership)</b>: Tombol <b>Edit</b> dan <b>Delete</b> hanya muncul aktif pada dokumen yang <b>dibuat oleh akun Anda sendiri</b>.
            </p>
          </div>
        }
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Table {...tableProps} rowKey="id">
        <Table.Column
          title="Document Title"
          dataIndex="title"
          key="title"
          render={(text: string, record: DocumentRecord) => (
            <Space direction="vertical" size={2}>
              <Typography.Text strong>
                <FileTextOutlined style={{ marginRight: 6 }} />
                {text}
              </Typography.Text>
              <Typography.Text type="secondary" ellipsis style={{ maxWidth: 350 }}>
                {record.content}
              </Typography.Text>
            </Space>
          )}
        />
        <Table.Column
          title="Department"
          dataIndex="department"
          key="department"
          render={(dept: string) => <Tag color="blue">{dept}</Tag>}
        />
        <Table.Column
          title="Classification"
          dataIndex="classification"
          key="classification"
          render={(val: string) => getClassificationTag(val)}
        />
        <Table.Column
          title="Target Plants"
          dataIndex="plants"
          key="plants"
          render={(plants: PlantRef[]) => {
            if (!plants || plants.length === 0) {
              return <Tag color="default">All / Cross-Plant</Tag>;
            }
            return (
              <Space wrap size={[2, 4]}>
                {plants.map((p) => (
                  <Tag color="volcano" key={p.plantId} title={p.plantName}>
                    {p.plantCode}
                  </Tag>
                ))}
              </Space>
            );
          }}
        />
        <Table.Column
          title="Owner (Author)"
          dataIndex="ownerUsername"
          key="ownerUsername"
          render={(username: string, record: DocumentRecord) => {
            const isOwner = currentUser?.id === record.ownerId;
            return (
              <Space>
                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: isOwner ? "#52c41a" : "#8c8c8c" }} />
                <span>{username}</span>
                {isOwner && <Tag color="green">You (Owner)</Tag>}
              </Space>
            );
          }}
        />
        <Table.Column
          title="Actions (ABAC Guarded)"
          dataIndex="actions"
          key="actions"
          render={(_, record: DocumentRecord) => (
            <Space>
              <CanAccess resource="documents" action="edit" params={{ ownerId: record.ownerId }}>
                <EditButton size="small" recordItemId={record.id} />
              </CanAccess>
              <CanAccess resource="documents" action="delete" params={{ ownerId: record.ownerId }}>
                <DeleteButton size="small" recordItemId={record.id} />
              </CanAccess>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

