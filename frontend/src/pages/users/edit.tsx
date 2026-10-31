import React from "react";
import { Edit, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const UserEditPage: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();
  const { selectProps: roleSelectProps } = useSelect({
    resource: "roles",
    optionLabel: "name",
    optionValue: "id",
  });

  const { selectProps: docSelectProps } = useSelect({
    resource: "documents",
    optionLabel: "title",
    optionValue: "id",
  });

  const { selectProps: plantSelectProps, queryResult: plantQueryResult } = useSelect({
    resource: "plants",
    optionLabel: "plantName",
    optionValue: "plantId",
  });

  const plantOptions = plantQueryResult.data?.data?.map((plant: any) => ({
    label: `${plant.plantCode} - ${plant.plantName} (${plant.plantType})`,
    value: plant.plantId,
  })) || plantSelectProps.options;

  return (
    <Edit saveButtonProps={saveButtonProps} title="Edit User">
      <Form {...formProps} layout="vertical">
        <Form.Item label="Username" name="username">
          <Input disabled />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Email wajib diisi" },
            { type: "email", message: "Format email tidak valid" },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Password Baru (Kosongkan jika tidak ingin mengubah)"
          name="password"
        >
          <Input.Password placeholder="Masukkan password baru jika ingin diganti" />
        </Form.Item>

        <Form.Item
          label="Plant (Location Reference)"
          name="plantId"
          tooltip="Lokasi Plant asal user"
        >
          <Select
            {...plantSelectProps}
            options={plantOptions}
            allowClear
            placeholder="Pilih Plant asal..."
          />
        </Form.Item>

        <Form.Item
          label="Department"
          name="department"
          rules={[{ required: true, message: "Departemen wajib dipilih" }]}
        >
          <Select
            options={[
              { label: "Executive", value: "Executive" },
              { label: "Finance", value: "Finance" },
              { label: "IT & Engineering", value: "IT & Engineering" },
              { label: "Operations", value: "Operations" },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Identity & Access Governance"
          name="roleIds"
          rules={[{ required: true, message: "Minimal 1 Identity & Access Governance wajib dipilih" }]}
          tooltip="Pilih satu atau lebih Role untuk pengguna ini"
        >
          <Select 
            {...roleSelectProps} 
            mode="multiple" 
            placeholder="Pilih Identity & Access Governance (Role)..." 
          />
        </Form.Item>

        <Form.Item
          label="Attribute-Based Access Control"
          name="documentIds"
          tooltip="Pilih satu atau lebih dokumen Attribute-Based Access Control yang berelasi dengan pengguna ini"
        >
          <Select
            {...docSelectProps}
            mode="multiple"
            allowClear
            placeholder="Pilih Attribute-Based Access Control (Dokumen)..."
          />
        </Form.Item>

        <Form.Item
          label="Theme Preference"
          name="themePreference"
          rules={[{ required: true, message: "Tema wajib dipilih" }]}
        >
          <Select
            options={[
              { label: "Corporate", value: "Corporate" },
              { label: "Light", value: "Light" },
              { label: "Dark", value: "Dark" },
            ]}
          />
        </Form.Item>
      </Form>
    </Edit>
  );
};
