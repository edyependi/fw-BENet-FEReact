import { DataProvider } from "@refinedev/core";
import { axiosInstance } from "../api/axiosInstance";

export const dataProvider: DataProvider = {
  getList: async ({ resource }) => {
    const { data } = await axiosInstance.get(`/${resource}`);
    const items = Array.isArray(data) ? data : [];
    return {
      data: items,
      total: items.length,
    };
  },

  getOne: async ({ resource, id }) => {
    const { data } = await axiosInstance.get(`/${resource}/${id}`);
    return { data };
  },

  create: async ({ resource, variables }) => {
    const { data } = await axiosInstance.post(`/${resource}`, variables);
    return { data };
  },

  update: async ({ resource, id, variables }) => {
    const { data } = await axiosInstance.put(`/${resource}/${id}`, variables);
    return { data };
  },

  deleteOne: async ({ resource, id }) => {
    const { data } = await axiosInstance.delete(`/${resource}/${id}`);
    return { data };
  },

  getApiUrl: () => "http://localhost:5000/api",
};

