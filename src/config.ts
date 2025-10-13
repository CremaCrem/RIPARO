export const API_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api";

export const BACKEND_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper function to resolve asset URLs
export function resolveAssetUrl(url: string): string {
  if (!url) return "";

  // If it's already a full URL, return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // If it's a relative URL starting with /storage, prepend the backend URL
  if (url.startsWith("/storage")) {
    return BACKEND_URL + url;
  }

  // For any other relative URL, prepend the backend URL
  return BACKEND_URL + (url.startsWith("/") ? url : "/" + url);
}
