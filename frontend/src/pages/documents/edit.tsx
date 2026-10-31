import React from "react";
import { Edit, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const DocumentEditPage: React.FC = () => {
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
    <Edit saveButtonProps={saveButtonProps} title="Edit Document (ABAC Guarded)">
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Document Title"
          name="title"
          rules={[{ required: true, message: "Judul dokumen wajib diisi" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Department (Owner Department)" name="department">
          <Input disabled />
        </Form.Item>

        <Form.Item
          label="Classification"
          name="classification"
          rules={[{ required: true, message: "Klasifikasi dokumen wajib dipilih" }]}
        >
          <Select
            options={[
              { label: "Internal", value: "Internal" },
              { label: "Confidential", value: "Confidential" },
              { label: "Public", value: "Public" },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Target Plants (Akses Multi-Plant)"
          name="plantIds"
          tooltip="Pilih satu atau lebih Plant yang berhak mengakses dokumen ini."
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
          label="Content"
          name="content"
          rules={[{ required: true, message: "Isi dokumen wajib diisi" }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Edit>
  );
};

