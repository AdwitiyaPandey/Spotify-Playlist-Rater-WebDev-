import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";

function ProtectedRoute({ children }) {
  const user = localStorage.getItem("authUser");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const userRaw = localStorage.getItem("authUser");

  if (!userRaw) return <Navigate to="/login" replace />;

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    localStorage.removeItem("authUser");
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user?.is_admin || user?.role === "admin";

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
