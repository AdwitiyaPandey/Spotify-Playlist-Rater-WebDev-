import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/register.css";
import catImg from "../assets/screamingcat.jpg";

function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!form.username.trim()) return "Username is required";
    if (!form.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    return "";
  };

  const register = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) return setError(validationError);

    setLoading(true);
    setError("");

    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password
      });

      navigate("/login");
    } catch (err) {
      setError(err.response?.data || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <form className="register-card" onSubmit={register}>
          <div className="avatar">
            <img src={catImg} alt="avatar" />
          </div>

          <h2>Create Account</h2>
          <p className="subtitle">Join and start building your playlist universe.</p>

          {error && <div className="error">{error}</div>}

          <label>Username</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            disabled={loading}
          />

          <label>Email</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
          />

          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            disabled={loading}
          />

          <button disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            Back to Login
          </button>

          <p className="auth-link">
            Already have an account? <span onClick={() => navigate("/login")}>Sign In</span>
          </p>
        </form>

        <div className="image-panel">
          <img src={catImg} alt="music" />
          <div className="image-copy">
            <h3>Create. Listen. Repeat.</h3>
            <p>Set up your profile and enjoy smooth access to your favorite tracks.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;