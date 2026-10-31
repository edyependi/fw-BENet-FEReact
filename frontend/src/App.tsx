import React from "react";
import { Refine, Authenticated } from "@refinedev/core";
import { ThemedLayoutV2, ThemedTitleV2, notificationProvider } from "@refinedev/antd";
import routerBindings, { UnsavedChangesNotifier } from "@refinedev/react-router-v6";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import {
  DashboardOutlined,
  TeamOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { dataProvider } from "./providers/dataProvider";
import { AppThemeProvider } from "./contexts/ThemeContext";
import { CustomHeader } from "./components/layout/CustomHeader";
import { LoginPage } from "./pages/login";
import { DashboardPage } from "./pages/dashboard";

// Users
import { UserListPage } from "./pages/users/list";
import { UserCreatePage } from "./pages/users/create";
import { UserEditPage } from "./pages/users/edit";

// Roles & Matrix
import { RoleListPage } from "./pages/roles/list";

// Documents & ABAC
import { DocumentListPage } from "./pages/documents/list";
import { DocumentCreatePage } from "./pages/documents/create";
import { DocumentEditPage } from "./pages/documents/edit";

import "@refinedev/antd/dist/reset.css";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Refine
        authProvider={authProvider}
        accessControlProvider={accessControlProvider}
        dataProvider={dataProvider}
        routerProvider={routerBindings}
        notificationProvider={notificationProvider}
        resources={[
          {
            name: "dashboard",
            list: "/dashboard",
            meta: {
              label: "Dashboard",
              icon: <DashboardOutlined />,
            },
          },
          {
            name: "application_setup",
            meta: {
              label: "Application Setup",
              icon: <SettingOutlined />,
            },
          },
          {
            name: "users",
            list: "/users",
            create: "/users/create",
            edit: "/users/edit/:id",
            meta: {
              parent: "application_setup",
              label: "User Management",
              icon: <TeamOutlined />,
              canDelete: true,
            },
          },
          {
            name: "documents",
            list: "/documents",
            create: "/documents/create",
            edit: "/documents/edit/:id",
            meta: {
              parent: "application_setup",
              label: "Attribute-Based Access Control",
              icon: <FileTextOutlined />,
              canDelete: true,
            },
          },
          {
            name: "roles",
            list: "/roles",
            meta: {
              parent: "application_setup",
              label: "Identity & Access Governance",
              icon: <SafetyCertificateOutlined />,
            },
          },
          {
            name: "plants",
            meta: {
              hide: true,
            },
          },
        ]}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
      >
        <AppThemeProvider>
          <Routes>
            <Route
              element={
                <Authenticated key="authenticated-routes" fallback={<Navigate to="/login" replace />}>
                  <ThemedLayoutV2
                    Header={CustomHeader}
                    Title={(props) => (
                      <ThemedTitleV2 {...props} text="Enterprise Hub" />
                    )}
                  >
                    <Outlet />
                  </ThemedLayoutV2>
                </Authenticated>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Documents (Data Ownership / ABAC) */}
              <Route path="/documents" element={<DocumentListPage />} />
              <Route path="/documents/create" element={<DocumentCreatePage />} />
              <Route path="/documents/edit/:id" element={<DocumentEditPage />} />

              {/* User Management */}
              <Route path="/users" element={<UserListPage />} />
              <Route path="/users/create" element={<UserCreatePage />} />
              <Route path="/users/edit/:id" element={<UserEditPage />} />

              {/* Dynamic Roles & Permissions Matrix */}
              <Route path="/roles" element={<RoleListPage />} />
            </Route>

            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <UnsavedChangesNotifier />
        </AppThemeProvider>
      </Refine>
    </BrowserRouter>
  );
};

export default App;
