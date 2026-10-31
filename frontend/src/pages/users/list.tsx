import React, { useState, useEffect, useMemo } from "react";
import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import {
  Table,
  Tag,
  Space,
  Avatar,
  Typography,
  Button,
  Modal,
  Upload,
  message,
  Alert,
  Card,
  Row,
  Col,
  Input,
  Select,
  Tooltip,
  Badge,
  List as AntList
} from "antd";
import {
  UserOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  DownloadOutlined,
  UploadOutlined,
  InboxOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
  ApartmentOutlined,
  TeamOutlined,
  BankOutlined
} from "@ant-design/icons";
import { CanAccess } from "@refinedev/core";
import { axiosInstance } from "../../api/axiosInstance";

interface UserRecord {
  id: string;
  username: string;
  email: string;
  department: string;
  plantId?: string;
  plantName?: string;
  plantCode?: string;
  roleId?: string;
  roleName?: string;
  roleIds?: string[];
  roleNames?: string[];
  documentIds?: string[];
  documentTitles?: string[];
  themePreference: string;
  createdAt: string;
}

interface PlantOption {
  plantId: string;
  plantName: string;
  plantCode: string;
}

interface RoleOption {
  id: string;
  name: string;
}

interface UploadResponse {
  success: boolean;
  message: string;
  usersCreated: number;
  usersSkipped: number;
  documentsCreated: number;
  warnings: string[];
}

export const UserListPage: React.FC = () => {
  const { tableProps, tableQueryResult } = useTable<UserRecord>({
    syncWithLocation: true,
  });

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  // Filter & Search states
  const [searchText, setSearchText] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(undefined);
  const [selectedPlant, setSelectedPlant] = useState<string | undefined>(undefined);
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
  const [selectedDocFilter, setSelectedDocFilter] = useState<string | undefined>(undefined);

  // Reference lists from API
  const [plantList, setPlantList] = useState<PlantOption[]>([]);
  const [roleList, setRoleList] = useState<RoleOption[]>([]);

  // Fetch reference lists for filter dropdowns
  useEffect(() => {
    axiosInstance.get("/plants")
      .then(res => {
        if (Array.isArray(res.data)) {
          setPlantList(res.data.map((p: any) => ({
            plantId: p.plantId,
            plantName: p.plantName,
            plantCode: p.plantCode
          })));
        }
      })
      .catch(() => {});

    axiosInstance.get("/roles")
      .then(res => {
        if (Array.isArray(res.data)) {
          setRoleList(res.data.map((r: any) => ({
            id: r.id,
            name: r.name
          })));
        }
      })
      .catch(() => {});
  }, []);

  const rawUsers = useMemo(() => {
    return (tableQueryResult?.data?.data as UserRecord[]) || [];
  }, [tableQueryResult?.data?.data]);

  // Extract distinct departments from users
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    rawUsers.forEach(u => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [rawUsers]);

  // Merged plants for filter (from API + existing in users)
  const availablePlants = useMemo(() => {
    const map = new Map<string, PlantOption>();
    plantList.forEach(p => map.set(p.plantId, p));
    rawUsers.forEach(u => {
      if (u.plantId && !map.has(u.plantId)) {
        map.set(u.plantId, {
          plantId: u.plantId,
          plantCode: u.plantCode || u.plantId,
          plantName: u.plantName || u.plantId
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.plantCode.localeCompare(b.plantCode));
  }, [plantList, rawUsers]);

  // Merged roles for filter (from API + existing in users)
  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    roleList.forEach(r => set.add(r.name));
    rawUsers.forEach(u => {
      if (u.roleNames) u.roleNames.forEach(rn => set.add(rn));
      if (u.roleName) set.add(u.roleName);
    });
    return Array.from(set).sort();
  }, [roleList, rawUsers]);

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return rawUsers.filter((u) => {
      // 1. Free-text search (Username, Email, Department, Plant, Roles)
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const matchUser = u.username?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchDept = u.department?.toLowerCase().includes(q);
        const matchPlant =
          u.plantCode?.toLowerCase().includes(q) ||
          u.plantName?.toLowerCase().includes(q);
        const matchRole =
          (u.roleNames || []).some(rn => rn.toLowerCase().includes(q)) ||
          u.roleName?.toLowerCase().includes(q);
        const matchDoc = (u.documentTitles || []).some(dt => dt.toLowerCase().includes(q));

        if (!matchUser && !matchEmail && !matchDept && !matchPlant && !matchRole && !matchDoc) {
          return false;
        }
      }

      // 2. Department filter
      if (selectedDepartment && u.department !== selectedDepartment) {
        return false;
      }

      // 3. Plant filter
      if (selectedPlant) {
        if (selectedPlant === "__NO_PLANT__") {
          if (u.plantId || u.plantCode) return false;
        } else if (u.plantId !== selectedPlant && u.plantCode !== selectedPlant) {
          return false;
        }
      }

      // 4. Role filter
      if (selectedRole) {
        const roles = (u.roleNames || []).concat(u.roleName ? [u.roleName] : []);
        if (!roles.includes(selectedRole)) {
          return false;
        }
      }

      // 5. ABAC Document status filter
      if (selectedDocFilter) {
        if (selectedDocFilter === "HAS_DOC") {
          if (!u.documentTitles || u.documentTitles.length === 0) return false;
        } else if (selectedDocFilter === "NO_DOC") {
          if (u.documentTitles && u.documentTitles.length > 0) return false;
        }
      }

      return true;
    });
  }, [rawUsers, searchText, selectedDepartment, selectedPlant, selectedRole, selectedDocFilter]);

  const hasActiveFilters = Boolean(
    searchText.trim() ||
    selectedDepartment ||
    selectedPlant ||
    selectedRole ||
    selectedDocFilter
  );

  const handleResetFilters = () => {
    setSearchText("");
    setSelectedDepartment(undefined);
    setSelectedPlant(undefined);
    setSelectedRole(undefined);
    setSelectedDocFilter(undefined);
  };

  const getRoleTag = (roleName: string) => {
    switch (roleName?.toLowerCase()) {
      case "super admin":
        return (
          <Tag color="gold" icon={<CrownOutlined />}>
            Super Admin
          </Tag>
        );
      case "finance manager":
        return (
          <Tag color="blue" icon={<SafetyCertificateOutlined />}>
            Finance Manager
          </Tag>
        );
      case "engineering staff":
        return <Tag color="cyan">Engineering Staff</Tag>;
      case "finance staff":
        return <Tag color="green">Finance Staff</Tag>;
      default:
        return (
          <Tag color="default" icon={<UserOutlined />}>
            {roleName || "User"}
          </Tag>
        );
    }
  };

  const getThemeTag = (theme: string) => {
    switch (theme?.toLowerCase()) {
      case "dark":
        return <Tag color="purple">Dark</Tag>;
      case "light":
        return <Tag color="orange">Light</Tag>;
      case "corporate":
      default:
        return <Tag color="cyan">Corporate</Tag>;
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      message.loading({ content: "Mengunduh template Excel...", key: "download" });
      const response = await axiosInstance.get("/users/template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Template_Import_User_Document_Role.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success({ content: "Template Excel berhasil diunduh!", key: "download" });
    } catch (err: any) {
      message.error({ content: "Gagal mengunduh template Excel", key: "download" });
    }
  };

  const handleUploadSubmit = async () => {
    if (!fileList.length) {
      message.warning("Silakan pilih file Excel (.xlsx) terlebih dahulu!");
      return;
    }
    const formData = new FormData();
    formData.append("file", fileList[0]);

    setUploading(true);
    setUploadResult(null);

    try {
      const response = await axiosInstance.post<UploadResponse>("/users/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data;
      setUploadResult(data);
      message.success(data.message || "Import file Excel berhasil!");
      tableQueryResult.refetch();
    } catch (err: any) {
      message.error(err.response?.data?.message || "Gagal memproses file Excel.");
    } finally {
      setUploading(false);
    }
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setFileList([]);
    setUploadResult(null);
  };

  return (
    <>
      <List
        headerButtons={() => (
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              Download Excel Template
            </Button>
            <CanAccess resource="users" action="create">
              <Button
                type="dashed"
                icon={<UploadOutlined />}
                onClick={() => setIsUploadModalOpen(true)}
              >
                Upload Excel Users
              </Button>
              <CreateButton />
            </CanAccess>
          </Space>
        )}
      >
        {/* Panel Filter & Pengelompokan User */}
        <Card
          size="small"
          style={{
            marginBottom: 16,
            borderRadius: 8,
            backgroundColor: "#fcfcfc",
            border: "1px solid #f0f0f0",
          }}
          bodyStyle={{ padding: "14px 16px" }}
        >
          {/* Baris 1: Filter Kontrol Utama */}
          <Row gutter={[10, 10]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Input
                placeholder="Cari nama, email, dept..."
                prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="middle"
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Semua Departemen"
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                allowClear
                style={{ width: "100%" }}
                size="middle"
                options={availableDepartments.map(d => ({ label: d, value: d }))}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Semua Plant"
                value={selectedPlant}
                onChange={setSelectedPlant}
                allowClear
                style={{ width: "100%" }}
                size="middle"
                options={[
                  ...availablePlants.map(p => ({
                    label: `${p.plantCode} - ${p.plantName}`,
                    value: p.plantId,
                  })),
                  { label: "Tanpa Plant Assigned", value: "__NO_PLANT__" },
                ]}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Identity & Access"
                value={selectedRole}
                onChange={setSelectedRole}
                allowClear
                style={{ width: "100%" }}
                size="middle"
                options={availableRoles.map(r => ({ label: r, value: r }))}
              />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Select
                placeholder="Status ABAC"
                value={selectedDocFilter}
                onChange={setSelectedDocFilter}
                allowClear
                style={{ width: "100%" }}
                size="middle"
                options={[
                  { label: "Punya Dokumen", value: "HAS_DOC" },
                  { label: "Tanpa Dokumen", value: "NO_DOC" },
                ]}
              />
            </Col>
            <Col xs={24} sm={12} md={3} style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <Space>
                {hasActiveFilters && (
                  <Tooltip title="Kembalikan semua filter">
                    <Button
                      size="middle"
                      icon={<ClearOutlined />}
                      onClick={handleResetFilters}
                      danger
                    >
                      Reset
                    </Button>
                  </Tooltip>
                )}
                <Tag color={hasActiveFilters ? "blue" : "default"} style={{ margin: 0, padding: "2px 8px" }}>
                  {filteredUsers.length} / {rawUsers.length} user
                </Tag>
              </Space>
            </Col>
          </Row>

          {/* Baris 2: Pengelompokan Cepat Berdasarkan Plant & Departemen */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px dashed #e8e8e8",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
            }}
          >
            <span style={{ color: "#666", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <BankOutlined style={{ color: "#fa541c" }} /> Plant:
            </span>
            <Tag.CheckableTag
              checked={!selectedPlant}
              onChange={() => setSelectedPlant(undefined)}
            >
              Semua
            </Tag.CheckableTag>
            {availablePlants.map((plant) => {
              const isChecked = selectedPlant === plant.plantId || selectedPlant === plant.plantCode;
              const count = rawUsers.filter(u => u.plantId === plant.plantId || u.plantCode === plant.plantCode).length;
              return (
                <Tag.CheckableTag
                  key={plant.plantId}
                  checked={isChecked}
                  onChange={(checked) => setSelectedPlant(checked ? plant.plantId : undefined)}
                >
                  {plant.plantCode} ({count})
                </Tag.CheckableTag>
              );
            })}

            <span style={{ color: "#d9d9d9", margin: "0 4px" }}>|</span>

            <span style={{ color: "#666", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ApartmentOutlined style={{ color: "#1677ff" }} /> Dept:
            </span>
            <Tag.CheckableTag
              checked={!selectedDepartment}
              onChange={() => setSelectedDepartment(undefined)}
            >
              Semua
            </Tag.CheckableTag>
            {availableDepartments.map((dept) => {
              const isChecked = selectedDepartment === dept;
              const count = rawUsers.filter(u => u.department === dept).length;
              return (
                <Tag.CheckableTag
                  key={dept}
                  checked={isChecked}
                  onChange={(checked) => setSelectedDepartment(checked ? dept : undefined)}
                >
                  {dept} ({count})
                </Tag.CheckableTag>
              );
            })}
          </div>
        </Card>

        <Table
          {...tableProps}
          dataSource={filteredUsers}
          rowKey="id"
          pagination={{
            ...tableProps.pagination,
            total: filteredUsers.length,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} user`,
          }}
        >
          <Table.Column
            title="User & Email"
            key="userAndEmail"
            render={(_: any, record: UserRecord) => (
              <Space align="center" size={10} style={{ whiteSpace: "nowrap" }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#1677ff" }} />
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                  <Typography.Text strong style={{ whiteSpace: "nowrap" }}>
                    {record.username}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {record.email}
                  </Typography.Text>
                </div>
              </Space>
            )}
          />
          <Table.Column
            title="Department"
            dataIndex="department"
            key="department"
            filters={availableDepartments.map(d => ({ text: d, value: d }))}
            onFilter={(value, record: UserRecord) => record.department === value}
            render={(dept: string) => (
              <Tag color="geekblue" style={{ whiteSpace: "nowrap" }}>
                {dept}
              </Tag>
            )}
          />
          <Table.Column
            title="Plant Origin"
            dataIndex="plantCode"
            key="plantCode"
            filters={availablePlants.map(p => ({ text: `${p.plantCode} - ${p.plantName}`, value: p.plantCode }))}
            onFilter={(value, record: UserRecord) => record.plantCode === value || record.plantId === value}
            render={(_: string, record: UserRecord) =>
              record.plantCode ? (
                <Tag color="volcano" style={{ whiteSpace: "nowrap" }}>
                  <strong>{record.plantCode}</strong> - {record.plantName}
                </Tag>
              ) : (
                <span style={{ color: "#999" }}>-</span>
              )
            }
          />
          <Table.Column
            title="Identity & Access"
            dataIndex="roleNames"
            key="roleNames"
            filters={availableRoles.map(r => ({ text: r, value: r }))}
            onFilter={(value, record: UserRecord) => {
              const roles = (record.roleNames || []).concat(record.roleName ? [record.roleName] : []);
              return roles.includes(value as string);
            }}
            render={(_: string[], record: UserRecord) => {
              const roles = record.roleNames && record.roleNames.length > 0
                ? record.roleNames
                : (record.roleName ? [record.roleName] : []);
              if (roles.length === 0) return <span style={{ color: "#999" }}>-</span>;
              return (
                <Space wrap size={[2, 4]}>
                  {roles.map((r, idx) => (
                    <span key={idx}>{getRoleTag(r)}</span>
                  ))}
                </Space>
              );
            }}
          />
          <Table.Column
            title="Attribute-Based"
            dataIndex="documentTitles"
            key="documentTitles"
            render={(_: string[], record: UserRecord) => {
              const docs = record.documentTitles && record.documentTitles.length > 0
                ? record.documentTitles
                : [];
              if (docs.length === 0) return <span style={{ color: "#999" }}>-</span>;
              return (
                <Space wrap size={[2, 4]}>
                  {docs.map((doc, idx) => (
                    <Tag color="cyan" key={idx} style={{ maxWidth: 160 }} title={doc}>
                      {doc.length > 18 ? doc.substring(0, 16) + "..." : doc}
                    </Tag>
                  ))}
                </Space>
              );
            }}
          />
          <Table.Column
            title="Theme"
            dataIndex="themePreference"
            key="themePreference"
            render={(value: string) => getThemeTag(value)}
          />
          <Table.Column
            title="Actions"
            dataIndex="actions"
            key="actions"
            render={(_, record: UserRecord) => (
              <Space wrap size={[4, 6]}>
                <CanAccess resource="users" action="edit" params={{ id: record.id }}>
                  <EditButton size="small" recordItemId={record.id} />
                </CanAccess>
                <CanAccess resource="users" action="delete" params={{ id: record.id }}>
                  <DeleteButton size="small" recordItemId={record.id} />
                </CanAccess>
              </Space>
            )}
          />
        </Table>
      </List>

      {/* Modal Upload Excel */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: "#52c41a", fontSize: 20 }} />
            <span>Upload Data User & Dokumen dari Excel</span>
          </Space>
        }
        open={isUploadModalOpen}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            Tutup
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={uploading}
            disabled={fileList.length === 0}
            onClick={handleUploadSubmit}
            icon={<CheckCircleOutlined />}
          >
            Mulai Proses Import
          </Button>,
        ]}
        width={680}
      >
        <Alert
          message="Panduan File Excel"
          description={
            <div style={{ fontSize: 13 }}>
              Template Excel memiliki 3 Sheet yang saling berelasi:
              <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                <li><b>Sheet 1 (Users)</b>: Berisi data akun, password, departemen, kode Plant (JKT1/SBY1/BDO1/HQ01), dan nama Identity & Access Governance (Role).</li>
                <li><b>Sheet 2 (Documents)</b>: Berisi dokumen inisial yang langsung direlasikan ke akun pembuat (OwnerUsername) dan target Multi-Plant.</li>
                <li><b>Sheet 3 (System Reference)</b>: Referensi daftar kode Plant dan nama Role yang saat ini terdaftar di sistem.</li>
              </ul>
              Belum punya template? Klik tombol <b>Download Excel Template</b> di atas.
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Upload.Dragger
          name="file"
          accept=".xlsx"
          multiple={false}
          fileList={fileList}
          beforeUpload={(file) => {
            setFileList([file]);
            return false; // Prevent auto upload
          }}
          onRemove={() => setFileList([])}
          style={{ padding: "16px 0" }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: "#1677ff", fontSize: 48 }} />
          </p>
          <p className="ant-upload-text">Klik atau seret file Excel (.xlsx) ke area ini</p>
          <p className="ant-upload-hint">
            Pastikan kolom pada sheet tidak diubah agar sistem dapat membaca data dengan akurat.
          </p>
        </Upload.Dragger>

        {uploadResult && (
          <div style={{ marginTop: 20 }}>
            <Alert
              message={uploadResult.message}
              type={uploadResult.warnings?.length > 0 ? "warning" : "success"}
              showIcon
              description={
                <div style={{ marginTop: 8 }}>
                  <Space direction="vertical" size={2}>
                    <div>• <b>User Baru:</b> {uploadResult.usersCreated} akun berhasil didaftarkan</div>
                    <div>• <b>Dokumen Terkait:</b> {uploadResult.documentsCreated} dokumen inisial dibuat</div>
                    <div>• <b>User Dilewati:</b> {uploadResult.usersSkipped} akun (sudah ada sebelumnya)</div>
                  </Space>
                  {uploadResult.warnings?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <Typography.Text type="secondary" strong>Catatan / Peringatan:</Typography.Text>
                      <AntList
                        size="small"
                        bordered
                        dataSource={uploadResult.warnings}
                        renderItem={(item) => <AntList.Item style={{ fontSize: 12 }}>{item}</AntList.Item>}
                        style={{ marginTop: 6, maxHeight: 120, overflowY: "auto", background: "#fff" }}
                      />
                    </div>
                  )}
                </div>
              }
            />
          </div>
        )}
      </Modal>
    </>
  );
};
