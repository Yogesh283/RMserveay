import axios, { type AxiosError } from 'axios';

const TOKEN_KEY = 'rm_publisher_sanctum_token';

export const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

export const axiosApi = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosApi.interceptors.request.use((config) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

/** Public routes (no bearer token). */
export const axiosPublic = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: string;
    auth?: boolean;
  } = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toLowerCase();
  const payload =
    options.body && ['post', 'put', 'patch'].includes(method)
      ? JSON.parse(options.body as string)
      : undefined;

  try {
    const client = options.auth === false ? axiosPublic : axiosApi;
    const res = await client.request<T>({
      url: path,
      method,
      data: payload,
    });
    return res.data as T;
  } catch (e) {
    const err = e as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
    const status = err.response?.status ?? 500;
    const data = err.response?.data;
    const msg =
      data?.message ||
      (data?.errors && Object.values(data.errors).flat().join(', ')) ||
      err.message ||
      'Request failed';
    throw new ApiError(msg, status, data);
  }
}
