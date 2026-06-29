export function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "null");
  } catch {
    return null;
  }
}

export function isAdmin(user) {
  return Boolean(user?.is_admin || user?.role === "admin");
}

export function logout(navigate) {
  localStorage.removeItem("authUser");
  navigate("/login");
}
