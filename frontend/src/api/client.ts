const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function req(path: string, opts: any = {}) {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const isForm = opts.body instanceof FormData;
  if (!isForm && opts.body) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && data.detail) || "Si è verificato un errore";
    throw new Error(typeof msg === "string" ? msg : "Si è verificato un errore");
  }
  return data;
}

export const videoFileUrl = (videoId: string) => `${BASE}/api/videos/${videoId}/file`;
export const videoThumbnailUrl = (videoId: string) => `${BASE}/api/videos/${videoId}/thumbnail`;

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    req("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => req("/api/auth/me"),
  verifyEmail: (token: string) =>
    req("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),
  resendVerify: () =>
    req("/api/auth/resend-verify", { method: "POST", body: "{}" }),
  forgotPassword: (email: string) =>
    req("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    req("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),

  categories: () => req("/api/categories"),
  home: () => req("/api/home"),

  applications: (category?: string, page = 1, limit = 20) => {
    const p = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (category) p.set("category", category);
    return req(`/api/applications?${p}`);
  },
  leaderboard: (category?: string, page = 1, limit = 20) => {
    const p = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (category) p.set("category", category);
    return req(`/api/applications/leaderboard?${p}`);
  },
  myApplications: (page = 1, limit = 20) =>
    req(`/api/applications/me?page=${page}&limit=${limit}`),
  createApplication: (body: any) =>
    req("/api/applications", { method: "POST", body: JSON.stringify(body) }),
  application: (id: string) => req(`/api/applications/${id}`),
  vote: (id: string) => req(`/api/applications/${id}/vote`, { method: "POST", body: "{}" }),
  deleteApplication: (id: string) => req(`/api/applications/${id}`, { method: "DELETE" }),

  uploadVideo: (formData: FormData) =>
    req("/api/videos/upload", { method: "POST", body: formData }),

  deleteAccount: () => req("/api/auth/me", { method: "DELETE" }),

  registerPushToken: (token: string) =>
    req("/api/push/token", { method: "POST", body: JSON.stringify({ token }) }),
  unregisterPushToken: (token: string) =>
    req("/api/push/token", { method: "DELETE", body: JSON.stringify({ token }) }),

  tour: () => req("/api/tour"),
  registerTour: (id: string) =>
    req(`/api/tour/${id}/register`, { method: "POST", body: "{}" }),
};
