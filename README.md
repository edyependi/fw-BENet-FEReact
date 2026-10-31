# Enterprise Portal - .NET 10 & React Refine Boilerplate

Boilerplate aplikasi web enterprise dengan arsitektur bersih, modular, ter-decoupling, serta dilengkapi **Permission Catalog (Master Data CRUD)**, **Dynamic Custom Roles (DB-Driven)**, **Two-Column Master-Detail Permission Matrix with Live Search**, **Data Ownership / ABAC**, dan **Dynamic Theming**.

## 🚀 Tech Stack
- **Backend**: .NET 10 (Web API), Entity Framework Core, SQLite (Decoupled Provider), JWT Bearer Authentication (Granular Permission Claims), Dynamic Policy Authorization Provider, BCrypt.
- **Frontend**: React 18, Refine (`@refinedev/core`), Ant Design (`@refinedev/antd`), Vite, TypeScript, Axios.
- **Identity & Access Governance**:
  - **Two-Column Master-Detail Matrix Editor**: Navigasi kategori di sebelah kiri dengan badge counter progresif (`3/5`), live search bar instan, dan switch filter *"Hanya yang Tercentang"*. Bebas dari masalah *infinite vertical scrolling*.
  - **Permission Catalog (Master Data CRUD)**: Pengelolaan master item permission via UI.
  - **System Core Protection**: 11 permission sistem bawaan bertanda **`System Core`** dan **dikunci permanen (tidak dapat dihapus)** demi integritas & stabilitas sistem.
  - **ABAC & Data Ownership**: Kontrol kepemilikan data pada level dokumen dan departemen.
- **Theming**: Ant Design `ConfigProvider` dinamis dengan 3 Preset (Light, Dark, Corporate) yang tersinkronisasi otomatis dengan profil user di database.

---

## 👥 Akun Bawaan (Default Seeded Users) untuk Pengujian

| Username | Password | Role | Departemen | Hak Akses |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | **Super Admin** | Executive | Memiliki seluruh hak akses. Dapat mengelola Role, Permission Catalog, User, dan seluruh Dokumen. |
| **`superadmin`** | `admin123` | **Super Admin** | Executive | Memiliki seluruh hak akses. Dapat mengelola Role, Permission Catalog, User, dan seluruh Dokumen. |
| **`financemanager`** | `manager123` | **Finance Manager** | Finance | Memiliki permission `documents.view_all`. Dapat memonitor seluruh dokumen Finance, tapi hanya bisa mengedit miliknya sendiri. |
| **`financestaff`** | `user123` | **Finance Staff** | Finance | Data Ownership murni: Hanya dapat mengedit/menghapus dokumen yang ia buat sendiri. |
| **`engstaff`** | `user123` | **Engineering Staff** | IT & Engineering | Mengelola dokumen teknis miliknya sendiri. |

---

## ⚡ Cara Menjalankan Aplikasi

- **Frontend**: [http://localhost:5173/](http://localhost:5173/)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Swagger Documentation**: [http://localhost:5000/swagger](http://localhost:5000/swagger)
