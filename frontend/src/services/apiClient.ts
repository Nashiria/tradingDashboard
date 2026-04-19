import axios from 'axios';

interface ApiSuccessResponse<T> {
  data: T;
}

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
});

export const createAuthHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const extractApiData = <T>(response: {
  data: ApiSuccessResponse<T> | T;
}): T => {
  const payload = response.data;

  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return (payload as ApiSuccessResponse<T>).data;
  }

  return payload as T;
};
