import axios from "axios";

export const API_BASE = "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000
});

export function getErrorMessage(err, fallback) {
  const responseData = err.response?.data;
  if (typeof responseData === "string") return responseData;
  if (responseData?.message) return responseData.message;

  if (err.code === "ECONNABORTED") {
    return "Request timed out. Make sure backend is running and try again.";
  }

  if (!err.response) {
    return "Cannot reach server. Start backend on http://localhost:5000 and check database connection.";
  }

  return fallback;
}
