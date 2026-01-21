import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import heroImage from "../assets/headphonecat.jpg";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password
      });
      alert("Logged in successfully");
    } catch (err) {
      setError(err.response?.data || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-layout">
        <form className="auth-card" onSubmit={login}>
          <p className="auth-brand">Spotify Auth</p>
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to continue your music journey.</p>

          {error && <div className="auth-error">{error}</div>}

          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <button type="submit" className="auth-primary-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <button
            type="button"
            className="auth-secondary-btn"
            onClick={() => navigate("/register")}
            disabled={loading}
          >
            Create New Account
          </button>

          <p className="auth-switch">
            Don’t have an account? <span onClick={() => navigate("/register")}>Sign Up</span>
          </p>
        </form>

        <div className="auth-image-panel">
          <img src={heroImage} alt="Music vibe" />
          <div className="auth-image-overlay">
            <h3>Feel Every Beat</h3>
            <p>Login to access your personalized playlist and discover fresh tracks daily.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
