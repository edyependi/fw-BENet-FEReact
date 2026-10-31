import React, { useState, useEffect, useMemo } from "react";
import { List, useTable } from "@refinedev/antd";
import { 
  Table, 
  Tag, 
  Space, 
  Typography, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Checkbox, 
  Divider, 
  Card, 
  Popconfirm, 
  message, 
  Tooltip, 
  Alert, 
  Tabs, 
  Row, 
  Col, 
  Switch, 
  Badge, 
  Empty 
} from "antd";
import { 
  CrownOutlined, 
  LockOutlined, 
  TeamOutlined, 
  CheckCircleOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined, 
  KeyOutlined, 
  SafetyCertificateOutlined, 
  DatabaseOutlined, 
  AppstoreOutlined, 
  CheckSquareOutlined, 
  SearchOutlined, 
  FolderOutlined, 
  FolderOpenOutlined, 
  FilterOutlined 
} from "@ant-design/icons";
import { CanAccess } from "@refinedev/core";
import { axiosInstance } from "../../api/axiosInstance";

interface RoleRecord {
  id: string;
  name: string;
  description: string;
  departmentScope: string | null;
  isSystemRole: boolean;
  permissions: string[];
  userCount: number;
}

interface PermissionRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  isSystemPermission: boolean;
}

export const RoleListPage: React.FC = () => {
  const { tableProps: roleTableProps, tableQueryResult: roleQueryResult } = useTable<RoleRecord>({
    resource: "roles",
    syncWithLocation: false,
  });

  const [activeTab, setActiveTab] = useState<string>("roles");

  // State untuk Data Permissions dari Database (Dynamic Catalog)
  const [permissionsList, setPermissionsList] = useState<PermissionRecord[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState<boolean>(false);

  // State untuk Permissions yang sedang dipilih di Modal Role (State-driven 100%)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // State untuk Two-Column Master-Detail UX
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showOnlySelected, setShowOnlySelected] = useState<boolean>(false);

  // Modal State untuk Role
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [roleForm] = Form.useForm();
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Modal State untuk Permission Catalog (Add / Edit Permission Item)
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<PermissionRecord | null>(null);
  const [permForm] = Form.useForm();
  const [isSubmittingPerm, setIsSubmittingPerm] = useState(false);

  // Fetch Permissions Catalog secara real-time dari Backend
  const fetchPermissions = async () => {
    setIsLoadingPermissions(true);
    try {
      const { data } = await axiosInstance.get<PermissionRecord[]>("/roles/permissions");
      const list = Array.isArray(data) ? data : [];
      setPermissionsList(list);
    } catch (err: any) {
      console.error("Gagal memuat daftar permission:", err);
      message.error(err.response?.data?.message || "Gagal memuat katalog permission dari server.");
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  // Daftar Kategori Unik dari Database
  const categories = useMemo(() => {
    const cats = Array.from(new Set(permissionsList.map((p) => p.category || "General")));
    return cats.sort();
  }, [permissionsList]);

  // Set default active category saat data siap
  useEffect(() => {
    if (categories.length > 0 && (!activeCategory || !categories.includes(activeCategory))) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  // Statistik Kategori: Berapa yang terpilih dari total per kategori
  const categoryStats = useMemo(() => {
    const stats: { [cat: string]: { selected: number; total: number } } = {};
    for (const cat of categories) {
      const catPerms = permissionsList.filter((p) => (p.category || "General") === cat);
      const selectedCount = catPerms.filter((p) => selectedPermissions.includes(p.code)).length;
      stats[cat] = { selected: selectedCount, total: catPerms.length };
    }
    return stats;
  }, [categories, permissionsList, selectedPermissions]);

  // Filter Search & "Show Selected Only"
  const filteredPermissions = useMemo(() => {
    return permissionsList.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchesSelected = !showOnlySelected || selectedPermissions.includes(p.code);

      return matchesSearch && matchesSelected;
    });
  }, [permissionsList, searchQuery, showOnlySelected, selectedPermissions]);

  // Daftar permission yang ditampilkan di kolom kanan
  const displayedPermissions = useMemo(() => {
    if (searchQuery.trim() || showOnlySelected) {
      // Jika mode cari atau filter aktif, tampilkan seluruh hasil filter
      return filteredPermissions;
    }
    // Mode normal: tampilkan permission milik kategori yang sedang aktif
    return permissionsList.filter((p) => (p.category || "General") === activeCategory);
  }, [permissionsList, activeCategory, searchQuery, showOnlySelected, filteredPermissions]);

  // Toggle satu permission
  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Toggle select all untuk kategori tertentu
  const selectAllInCategory = (catName: string) => {
    const catCodes = permissionsList
      .filter((p) => (p.category || "General") === catName)
      .map((p) => p.code);
    setSelectedPermissions((prev) => Array.from(new Set([...prev, ...catCodes])));
  };

  const deselectAllInCategory = (catName: string) => {
    const catCodes = permissionsList
      .filter((p) => (p.category || "General") === catName)
      .map((p) => p.code);
    setSelectedPermissions((prev) => prev.filter((c) => !catCodes.includes(c)));
  };

  // Handle Role Form
  const openCreateRoleModal = () => {
    setEditingRole(null);
    roleForm.resetFields();
    roleForm.setFieldsValue({
      name: "",
      description: "",
      departmentScope: null,
    });
    setSelectedPermissions(["documents.view", "documents.create"]);
    setSearchQuery("");
    setShowOnlySelected(false);
    if (categories.length > 0) setActiveCategory(categories[0]);
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (role: RoleRecord) => {
    setEditingRole(role);
    roleForm.resetFields();
    roleForm.setFieldsValue({
      name: role.name,
      description: role.description,
      departmentScope: role.departmentScope || null,
    });
    setSelectedPermissions(role.permissions || []);
    setSearchQuery("");
    setShowOnlySelected(false);
    if (categories.length > 0) setActiveCategory(categories[0]);
    setIsRoleModalOpen(true);
  };

  const handleRoleSubmit = async () => {
    try {
      const values = await roleForm.validateFields();
      setIsSubmittingRole(true);

      if (editingRole) {
        await axiosInstance.put(`/roles/${editingRole.id}`, {
          name: values.name,
          description: values.description,
          departmentScope: values.departmentScope,
          permissions: selectedPermissions,
        });
        message.success(`Role "${values.name}" dan permission matrix berhasil diperbarui!`);
      } else {
        await axiosInstance.post("/roles", {
          name: values.name,
          description: values.description,
          departmentScope: values.departmentScope,
          permissions: selectedPermissions,
        });
        message.success(`Role baru "${values.name}" berhasil dibuat!`);
      }

      setIsRoleModalOpen(false);
      roleQueryResult.refetch();
    } catch (err: any) {
      message.error(err.response?.data?.message || "Gagal menyimpan role.");
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleDeleteRole = async (role: RoleRecord) => {
    try {
      await axiosInstance.delete(`/roles/${role.id}`);
      message.success(`Role "${role.name}" berhasil dihapus.`);
      roleQueryResult.refetch();
    } catch (err: any) {
      message.error(err.response?.data?.message || "Gagal menghapus role.");
    }
  };

  // Handle Permission Catalog Form
  const openCreatePermModal = () => {
    setEditingPerm(null);
    permForm.resetFields();
    permForm.setFieldsValue({
      code: "",
      name: "",
      category: "Custom Modules",
      description: "",
    });
    setIsPermModalOpen(true);
  };

  const openEditPermModal = (perm: PermissionRecord) => {
    setEditingPerm(perm);
    permForm.resetFields();
    permForm.setFieldsValue({
      code: perm.code,
      name: perm.name,
      category: perm.category,
      description: perm.description,
    });
    setIsPermModalOpen(true);
  };

  const handlePermSubmit = async () => {
    try {
      const values = await permForm.validateFields();
      setIsSubmittingPerm(true);

      if (editingPerm) {
        await axiosInstance.put(`/roles/permissions/${editingPerm.id}`, {
          name: values.name,
          category: values.category,
          description: values.description,
        });
        message.success(`Permission "${values.name}" berhasil diperbarui!`);
      } else {
        await axiosInstance.post("/roles/permissions", {
          code: values.code,
          name: values.name,
          category: values.category,
          description: values.description,
        });
        message.success(`Permission item "${values.code}" berhasil ditambahkan ke katalog!`);
      }

      setIsPermModalOpen(false);
      await fetchPermissions();
      roleQueryResult.refetch();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || "Gagal menyimpan permission baru.");
    } finally {
      setIsSubmittingPerm(false);
    }
  };

  const handleDeletePerm = async (perm: PermissionRecord) => {
    if (perm.isSystemPermission) {
      message.warning("System Core Permission bertanda khusus dilarang dihapus.");
      return;
    }

    try {
      await axiosInstance.delete(`/roles/permissions/${perm.id}`);
      message.success(`Permission "${perm.code}" berhasil dihapus.`);
      await fetchPermissions();
      roleQueryResult.refetch();
    } catch (err: any) {
      message.error(err.response?.data?.message || "Gagal menghapus permission.");
    }
  };

  const tabItems = [
    {
      key: "roles",
      label: (
        <span>
          <SafetyCertificateOutlined /> Identity & Access Governance Matrix
        </span>
      ),
      children: (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Typography.Text type="secondary">
              Kelola peran pengguna dan atur hak akses granular secara dinamis menggunakan matrix checklist.
            </Typography.Text>
            <CanAccess resource="roles" action="create">
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRoleModal}>
                Create New Custom Role
              </Button>
            </CanAccess>
          </div>

          <Table {...roleTableProps} rowKey="id">
            <Table.Column
              title="Role Name"
              dataIndex="name"
              key="name"
              render={(name: string, record: RoleRecord) => (
                <Space direction="vertical" size={2}>
                  <Space>
                    <Typography.Text strong>{name}</Typography.Text>
                    {record.isSystemRole && (
                      <Tooltip title="System Role bawaan">
                        <Tag color="volcano" icon={<LockOutlined />}>
                          System
                        </Tag>
                      </Tooltip>
                    )}
                  </Space>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {record.description}
                  </Typography.Text>
                </Space>
              )}
            />

            <Table.Column
              title="Department Scope"
              dataIndex="departmentScope"
              key="departmentScope"
              render={(scope: string | null) => (
                <Tag color={scope ? "blue" : "purple"}>
                  {scope ? scope : "Global / All Departments"}
                </Tag>
              )}
            />

            <Table.Column
              title="Active Users"
              dataIndex="userCount"
              key="userCount"
              render={(count: number) => (
                <Space>
                  <TeamOutlined />
                  <span>{count} Users</span>
                </Space>
              )}
            />

            <Table.Column
              title="Granted Permission Matrix"
              dataIndex="permissions"
              key="permissions"
              render={(permissions: string[]) => (
                <Space wrap size={[4, 6]}>
                  {permissions.map((perm) => (
                    <Tag color="cyan" key={perm} style={{ fontSize: 11 }}>
                      <CheckCircleOutlined style={{ marginRight: 3 }} />
                      {perm}
                    </Tag>
                  ))}
                </Space>
              )}
            />

            <Table.Column
              title="Actions"
              key="actions"
              render={(_, record: RoleRecord) => (
                <Space>
                  <CanAccess resource="roles" action="edit">
                    <Button 
                      size="small" 
                      type="primary" 
                      ghost
                      icon={<EditOutlined />} 
                      onClick={() => openEditRoleModal(record)}
                    >
                      Edit Matrix
                    </Button>
                  </CanAccess>

                  {!record.isSystemRole && (
                    <CanAccess resource="roles" action="delete">
                      <Popconfirm
                        title="Hapus Role Ini?"
                        description={`Yakin ingin menghapus role "${record.name}"?`}
                        onConfirm={() => handleDeleteRole(record)}
                        okText="Hapus"
                        cancelText="Batal"
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </CanAccess>
                  )}
                </Space>
              )}
            />
          </Table>
        </div>
      ),
    },
    {
      key: "permissions",
      label: (
        <span>
          <KeyOutlined /> Permission Catalog (Master Data)
        </span>
      ),
      children: (
        <div>
          <Alert
            message="Katalog Master Granular Permissions"
            description="Item permission bertanda 'System Core (Protected)' tetap ditampilkan agar Anda dapat memonitor seluruh hak akses sistem, namun diproteksi permanen sehingga tidak bisa didelete. Anda dapat menambahkan item permission baru di bawah ini."
            type="info"
            showIcon
            icon={<LockOutlined />}
            style={{ marginBottom: 16 }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Typography.Text type="secondary">
              Total <b>{permissionsList.length}</b> Permissions terdaftar di sistem.
            </Typography.Text>
            <CanAccess resource="roles" action="create">
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreatePermModal}>
                + Add New Permission Item
              </Button>
            </CanAccess>
          </div>

          <Table 
            dataSource={permissionsList} 
            rowKey="id" 
            loading={isLoadingPermissions}
            pagination={{ pageSize: 12 }}
          >
            <Table.Column
              title="Permission Code"
              dataIndex="code"
              key="code"
              render={(code: string, record: PermissionRecord) => (
                <Space>
                  <Typography.Text code strong style={{ color: "#1677ff", fontSize: 13 }}>
                    {code}
                  </Typography.Text>
                  {record.isSystemPermission ? (
                    <Tag color="blue" icon={<LockOutlined />}>
                      System Core (Protected)
                    </Tag>
                  ) : (
                    <Tag color="green">Custom Module</Tag>
                  )}
                </Space>
              )}
            />

            <Table.Column
              title="Display Name"
              dataIndex="name"
              key="name"
              render={(name: string) => <Typography.Text strong>{name}</Typography.Text>}
            />

            <Table.Column
              title="Category (Auto-Grouping Header)"
              dataIndex="category"
              key="category"
              render={(cat: string) => (
                <Tag color="geekblue" icon={<AppstoreOutlined />}>
                  {cat}
                </Tag>
              )}
            />

            <Table.Column
              title="Description"
              dataIndex="description"
              key="description"
              render={(desc: string) => <Typography.Text type="secondary">{desc}</Typography.Text>}
            />

            <Table.Column
              title="Actions"
              key="actions"
              render={(_, record: PermissionRecord) => (
                <Space>
                  <CanAccess resource="roles" action="edit">
                    <Button 
                      size="small" 
                      icon={<EditOutlined />} 
                      onClick={() => openEditPermModal(record)}
                    >
                      Edit
                    </Button>
                  </CanAccess>

                  {record.isSystemPermission ? (
                    <Tooltip title="System Core Permission bertanda khusus dikunci permanen dan tidak bisa didelete untuk menjaga integritas sistem.">
                      <Button size="small" disabled danger icon={<LockOutlined />}>
                        Protected
                      </Button>
                    </Tooltip>
                  ) : (
                    <CanAccess resource="roles" action="delete">
                      <Popconfirm
                        title="Hapus Permission Item?"
                        description={`Yakin ingin menghapus permission "${record.code}"?`}
                        onConfirm={() => handleDeletePerm(record)}
                        okText="Hapus"
                        cancelText="Batal"
                      >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                          Hapus
                        </Button>
                      </Popconfirm>
                    </CanAccess>
                  )}
                </Space>
              )}
            />
          </Table>
        </div>
      ),
    },
  ];

  return (
    <List title="Identity & Access Governance">
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" />

      {/* MODAL TWO-COLUMN MASTER-DETAIL + SEARCH BAR */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <KeyOutlined style={{ color: "#1677ff", fontSize: 18 }} />
            <div>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {editingRole ? `Permission Matrix: ${editingRole.name}` : "Create New Custom Role"}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Atur wewenang akses dengan navigasi kategori di sebelah kiri dan live search bar.
              </Typography.Text>
            </div>
          </div>
        }
        open={isRoleModalOpen}
        onOk={handleRoleSubmit}
        onCancel={() => setIsRoleModalOpen(false)}
        confirmLoading={isSubmittingRole}
        width={960}
        style={{ top: 24 }}
        okText="Simpan Matrix Hak Akses"
        cancelText="Batal"
      >
        <Form form={roleForm} layout="vertical" style={{ marginTop: 12 }}>
          {/* Form Header: Info Role */}
          <Row gutter={16}>
            <Col xs={24} sm={14}>
              <Form.Item
                label="Role Name"
                name="name"
                rules={[{ required: true, message: "Nama role wajib diisi" }]}
                help={editingRole?.isSystemRole ? "Nama System Role bawaan dikunci untuk stabilitas sistem." : undefined}
                style={{ marginBottom: 12 }}
              >
                <Input disabled={editingRole?.isSystemRole} placeholder="contoh: Regional Auditor / Billing Specialist" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item label="Department Scope (ABAC Boundary)" name="departmentScope" style={{ marginBottom: 12 }}>
                <Select
                  allowClear
                  placeholder="Pilih departemen khusus, atau Global"
                  options={[
                    { label: "Global / All Departments (Tanpa Batasan)", value: null },
                    { label: "Executive", value: "Executive" },
                    { label: "Finance", value: "Finance" },
                    { label: "IT & Engineering", value: "IT & Engineering" },
                    { label: "Operations", value: "Operations" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Role Description" name="description" rules={[{ required: true, message: "Deskripsi role wajib diisi" }]} style={{ marginBottom: 14 }}>
            <Input.TextArea rows={1} placeholder="Jelaskan peran dan wewenang pengguna dengan role ini..." />
          </Form.Item>

          {/* SEARCH & FILTER TOOLBAR */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <Input
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              placeholder="Cari permission berdasarkan kode (e.g. documents.create), nama, atau deskripsi..."
              allowClear
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: 450 }}
            />

            <Space size="middle">
              <Space size={6}>
                <Switch
                  checked={showOnlySelected}
                  onChange={setShowOnlySelected}
                  size="small"
                />
                <Typography.Text style={{ fontSize: 13 }}>Hanya yang Tercentang</Typography.Text>
              </Space>

              <Tag color="blue" style={{ fontSize: 12, padding: "2px 8px" }}>
                Total Terpilih: <b>{selectedPermissions.length}</b> / {permissionsList.length}
              </Tag>
            </Space>
          </div>

          {/* TWO-COLUMN MASTER-DETAIL CONTAINER (FIXED HEIGHT: 430px) */}
          <div
            style={{
              display: "flex",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              height: 430,
              overflow: "hidden",
            }}
          >
            {/* KOLOM KIRI: DAFTAR KATEGORI (MASTER) */}
            <div
              style={{
                width: 280,
                borderRight: "1px solid #e2e8f0",
                background: "#f8fafc",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#f1f5f9" }}>
                <Typography.Text strong style={{ fontSize: 12, textTransform: "uppercase", color: "#64748b" }}>
                  Kategori Hak Akses ({categories.length})
                </Typography.Text>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {categories.map((cat) => {
                  const stats = categoryStats[cat] || { selected: 0, total: 0 };
                  const isCatActive = !searchQuery.trim() && !showOnlySelected && activeCategory === cat;
                  const isAllSelected = stats.total > 0 && stats.selected === stats.total;
                  const isPartiallySelected = stats.selected > 0 && stats.selected < stats.total;

                  return (
                    <div
                      key={cat}
                      onClick={() => {
                        setSearchQuery("");
                        setShowOnlySelected(false);
                        setActiveCategory(cat);
                      }}
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: isCatActive ? "#e0f2fe" : "transparent",
                        borderLeft: isCatActive ? "4px solid #0284c7" : "4px solid transparent",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Space size={8}>
                        {isCatActive ? (
                          <FolderOpenOutlined style={{ color: "#0284c7", fontSize: 16 }} />
                        ) : (
                          <FolderOutlined style={{ color: "#94a3b8", fontSize: 16 }} />
                        )}
                        <Typography.Text strong={isCatActive} style={{ color: isCatActive ? "#0369a1" : "#334155" }}>
                          {cat}
                        </Typography.Text>
                      </Space>

                      <Tag
                        color={isAllSelected ? "green" : isPartiallySelected ? "blue" : "default"}
                        style={{ margin: 0, fontSize: 11, borderRadius: 10 }}
                      >
                        {stats.selected} / {stats.total}
                      </Tag>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* KOLOM KANAN: CHECKBOX PERMISSION MATRIX (DETAIL) */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "#ffffff",
              }}
            >
              {/* Header Kolom Kanan */}
              <div
                style={{
                  padding: "10px 18px",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fafafa",
                }}
              >
                <div>
                  <Typography.Text strong style={{ fontSize: 14 }}>
                    {searchQuery.trim()
                      ? `Hasil Pencarian: "${searchQuery}"`
                      : showOnlySelected
                      ? "Daftar Permission yang Sedang Tercentang"
                      : `Kategori: ${activeCategory}`}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    ({displayedPermissions.length} item)
                  </Typography.Text>
                </div>

                {!searchQuery.trim() && !showOnlySelected && (
                  <Space size={6}>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => selectAllInCategory(activeCategory)}
                    >
                      Pilih Semua Kategori Ini
                    </Button>
                    <Divider type="vertical" />
                    <Button
                      size="small"
                      type="link"
                      danger
                      onClick={() => deselectAllInCategory(activeCategory)}
                    >
                      Batal Semua
                    </Button>
                  </Space>
                )}
              </div>

              {/* Isi Daftar Checkbox (Scrollable) */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {displayedPermissions.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      searchQuery.trim()
                        ? "Tidak ada permission yang cocok dengan kata kunci pencarian."
                        : showOnlySelected
                        ? "Belum ada permission yang dicentang."
                        : "Tidak ada permission pada kategori ini."
                    }
                    style={{ marginTop: 48 }}
                  />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                    {displayedPermissions.map((p) => {
                      const isChecked = selectedPermissions.includes(p.code);

                      return (
                        <div
                          key={p.code}
                          onClick={() => togglePermission(p.code)}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            padding: "10px 14px",
                            borderRadius: 8,
                            cursor: "pointer",
                            background: isChecked ? "#f0fdf4" : "#ffffff",
                            border: isChecked ? "1px solid #86efac" : "1px solid #e2e8f0",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Checkbox
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              togglePermission(p.code);
                            }}
                            style={{ marginTop: 2, marginRight: 12 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Space size={6}>
                                <Typography.Text strong style={{ fontSize: 13, color: isChecked ? "#15803d" : "#0f172a" }}>
                                  {p.code}
                                </Typography.Text>
                                {p.isSystemPermission && (
                                  <Tooltip title="System Core Permission">
                                    <Tag color="blue" icon={<LockOutlined />} style={{ fontSize: 10, padding: "0 4px", margin: 0 }}>
                                      System Core
                                    </Tag>
                                  </Tooltip>
                                )}
                              </Space>

                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {p.name}
                              </Typography.Text>
                            </div>

                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                              {p.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Form>
      </Modal>

      {/* MODAL ADD / EDIT PERMISSION CATALOG ITEM */}
      <Modal
        title={
          <Space>
            <DatabaseOutlined style={{ color: "#52c41a" }} />
            <span>{editingPerm ? `Edit Permission: ${editingPerm.code}` : "Add New Permission Item"}</span>
          </Space>
        }
        open={isPermModalOpen}
        onOk={handlePermSubmit}
        onCancel={() => setIsPermModalOpen(false)}
        confirmLoading={isSubmittingPerm}
        okText="Simpan Permission Item"
        cancelText="Batal"
      >
        <Form form={permForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Permission Code (Unique Identifier)"
            name="code"
            rules={[
              { required: true, message: "Kode permission wajib diisi" },
              { pattern: /^[a-z0-9_]+(\.[a-z0-9_]+)+$/, message: "Format harus domain.action (contoh: reports.export, billing.cancel)" }
            ]}
            help={editingPerm ? "Kode unik permission tidak dapat diubah setelah dibuat." : "Gunakan format domain.action (contoh: invoices.approve, audit.logs)"}
          >
            <Input disabled={!!editingPerm} placeholder="contoh: invoices.approve" />
          </Form.Item>

          <Form.Item
            label="Display Name"
            name="name"
            rules={[{ required: true, message: "Nama tampilan wajib diisi" }]}
          >
            <Input placeholder="contoh: Approve Customer Invoices" />
          </Form.Item>

          <Form.Item
            label="Category Group (Auto-Grouping Header)"
            name="category"
            rules={[{ required: true, message: "Kategori wajib diisi" }]}
            help="Pilih dari daftar atau ketik nama kategori baru."
          >
            <Select
              allowClear
              showSearch
              placeholder="Pilih atau ketik kategori baru"
              options={categories.map((c) => ({ label: c, value: c }))}
            />
          </Form.Item>

          <Form.Item
            label="Description / Purpose"
            name="description"
            rules={[{ required: true, message: "Deskripsi wajib diisi" }]}
          >
            <Input.TextArea rows={2} placeholder="Jelaskan hak akses atau wewenang apa yang diatur..." />
          </Form.Item>
        </Form>
      </Modal>
    </List>
  );
};
