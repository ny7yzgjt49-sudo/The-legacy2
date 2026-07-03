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

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    req("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => req("/api/auth/me"),

  categories: () => req("/api/categories"),
  home: () => req("/api/home"),

  applications: (category?: string) =>
    req(`/api/applications${category ? `?category=${category}` : ""}`),
  leaderboard: (category?: string) =>
    req(`/api/applications/leaderboard${category ? `?category=${category}` : ""}`),
  myApplications: () => req("/api/applications/me"),
  createApplication: (body: any) =>
    req("/api/applications", { method: "POST", body: JSON.stringify(body) }),
  vote: (id: string) => req(`/api/applications/${id}/vote`, { method: "POST", body: "{}" }),

  uploadVideo: (formData: FormData) =>
    req("/api/videos/upload", { method: "POST", body: formData }),

  tour: () => req("/api/tour"),
  registerTour: (id: string) =>
    req(`/api/tour/${id}/register`, { method: "POST", body: "{}" }),
};
