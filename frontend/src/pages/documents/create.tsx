import React from "react";
import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select } from "antd";
import { useGetIdentity } from "@refinedev/core";
import { UserProfile } from "../../providers/authProvider";

export const DocumentCreatePage: React.FC = () => {
  const { data: user } = useGetIdentity<UserProfile>();
  const { formProps, saveButtonProps } = useForm();

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
    <Create saveButtonProps={saveButtonProps} title="Create New Document">
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          classification: "Internal",
          department: user?.department || "Finance",
        }}
      >
        <Form.Item
          label="Document Title"
          name="title"
          rules={[{ required: true, message: "Judul dokumen wajib diisi" }]}
        >
          <Input placeholder="contoh: Rencana Anggaran Q4 2026" />
        </Form.Item>

        <Form.Item
          label="Department Scope"
          name="department"
          rules={[{ required: true, message: "Departemen wajib dipilih" }]}
        >
          <Select
            options={[
              { label: "Finance", value: "Finance" },
              { label: "IT & Engineering", value: "IT & Engineering" },
              { label: "Executive", value: "Executive" },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Classification"
          name="classification"
          rules={[{ required: true, message: "Klasifikasi dokumen wajib dipilih" }]}
        >
          <Select
            options={[
              { label: "Internal (Khusus internal perusahaan)", value: "Internal" },
              { label: "Confidential (Sensitif / Rahasia)", value: "Confidential" },
              { label: "Public (Dapat dilihat publik)", value: "Public" },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Target Plants (Akses Multi-Plant)"
          name="plantIds"
          tooltip="Pilih satu atau lebih Plant yang berhak mengakses dokumen ini. Jika dikosongkan, dokumen berlaku untuk seluruh Plant."
        >
          <Select
            {...plantSelectProps}
            options={plantOptions}
            mode="multiple"
            allowClear
            placeholder="Pilih Plant target (Multi-select)..."
          />
        </Form.Item>

        <Form.Item
          label="Content / Summary"
          name="content"
          rules={[{ required: true, message: "Isi dokumen wajib diisi" }]}
        >
          <Input.TextArea rows={4} placeholder="Tuliskan ringkasan atau isi dokumen..." />
        </Form.Item>
      </Form>
    </Create>
  );
};

