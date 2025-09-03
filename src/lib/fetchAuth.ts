/**
 * Wrapper around fetch that automatically attaches Bearer token from localStorage (key: "token").
 */
export function fetchAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = localStorage.getItem("token") || "";
  const headers: Record<string, string> = {
    ...(init.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(input, { ...init, headers });
}
