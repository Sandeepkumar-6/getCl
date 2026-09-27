import axios from "axios";
export const api = axios.create({ baseURL: "/api", timeout: 15000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("getclaim-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      error.response?.status === 401 &&
      localStorage.getItem("getclaim-token")
    ) {
      localStorage.removeItem("getclaim-token");
      window.dispatchEvent(new Event("session-expired"));
    }
    return Promise.reject(error);
  },
);
// Messages people can act on; never mention servers or databases.
export const errorMessage = (e) =>
  e.response?.data?.message ||
  (e.code === "ECONNABORTED"
    ? "This is taking longer than usual. Try again in a minute."
    : e.response
      ? "Something went wrong on our side. Try again in a minute."
      : "We couldn’t reach getClaim. Check your connection and try again.");
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function download(claimId, doc) {
  const response = await api.get(
    `/claims/${claimId}/documents/${doc._id}/download`,
    { responseType: "blob" },
  );
  saveBlob(response.data, doc.originalName);
}
export async function downloadPolicy(policy) {
  const response = await api.get(`/policies/${policy._id}/document`, {
    responseType: "blob",
  });
  saveBlob(response.data, policy.document?.originalName || `${policy.policyNumber}.pdf`);
}
export async function downloadPath(path, name) {
  const response = await api.get(path, { responseType: "blob" });
  saveBlob(response.data, name);
}
