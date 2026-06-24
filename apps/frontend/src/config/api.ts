// Centralized API configuration for the Embedded Collective frontend.

const viteApiUrl = import.meta.env.VITE_API_URL;

if (!viteApiUrl && import.meta.env.PROD) {
  console.warn(
    "[WARNING] VITE_API_URL environment variable is missing in the production environment. " +
    "Backend API calls will default to relative paths."
  );
}

// Clean up trailing slash if present, or fallback to empty string for relative paths
export const API_BASE_URL = viteApiUrl ? viteApiUrl.replace(/\/$/, "") : "";

/**
 * Utility function to construct fully qualified API URLs using the centralized base URL.
 * Falls back to relative pathing if API_BASE_URL is not set.
 */
export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Global Fetch Interceptor to ensure all relative fetch requests automatically use the API_BASE_URL
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === "string" && input.startsWith("/api/")) {
    input = getApiUrl(input);
  }
  return originalFetch(input, init);
};
