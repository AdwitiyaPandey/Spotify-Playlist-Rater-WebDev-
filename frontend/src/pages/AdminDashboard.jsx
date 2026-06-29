import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, getErrorMessage } from "../utils/api";
import { logout } from "../utils/auth";
import "../styles/dashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [stats, setStats] = useState({
    usersCount: 0,
    playlistsCount: 0,
    avgRating: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [usersRes, playlistsRes, statsRes] = await Promise.all([
        apiClient.get("/admin/users"),
        apiClient.get("/admin/playlists"),
        apiClient.get("/admin/stats")
      ]);

      setUsers(usersRes.data || []);
      setPlaylists(playlistsRes.data || []);
      setStats(statsRes.data || { usersCount: 0, playlistsCount: 0, avgRating: 0 });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load admin dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteUser = async (id) => {
    try {
      await apiClient.delete(`/admin/users/${id}`);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete user"));
    }
  };

  const deletePlaylist = async (id) => {
    try {
      await apiClient.delete(`/admin/playlists/${id}`);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete playlist"));
    }
  };

  const handleLogout = () => logout(navigate);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-actions">
          <button className="nav-btn" onClick={() => navigate("/dashboard")}>User View</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error ? <p className="dashboard-error">{error}</p> : null}

      <div className="admin-stats-grid">
        <article className="admin-stat-card">
          <p>Total Users</p>
          <h2>{stats.usersCount}</h2>
        </article>
        <article className="admin-stat-card">
          <p>Total Rated Playlists</p>
          <h2>{stats.playlistsCount}</h2>
        </article>
        <article className="admin-stat-card">
          <p>Average Playlist Rating</p>
          <h2>{stats.avgRating}</h2>
        </article>
      </div>

      {loading ? <p>Loading dashboard data...</p> : null}

      <section className="admin-section">
        <h2>Users</h2>
        {users.length === 0 ? <p>No users found.</p> : null}
        <div className="admin-list">
          {users.map((user) => (
            <article className="admin-list-item" key={user.id}>
              <div>
                <p className="admin-item-title">{user.username}</p>
                <p>{user.email}</p>
              </div>
              <button className="danger-btn" onClick={() => deleteUser(user.id)}>Delete</button>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h2>Playlists</h2>
        {playlists.length === 0 ? <p>No rated playlists found.</p> : null}
        <div className="admin-list">
          {playlists.map((playlist) => (
            <article key={playlist.id} className="admin-list-item">
              <div>
                <p className="admin-item-title">{playlist.name || "Untitled Playlist"}</p>
                <p>
                  Rating: {playlist.rating ?? "N/A"} | Genre: {playlist.top_genre || "Unknown"}
                </p>
              </div>
              <button className="danger-btn" onClick={() => deletePlaylist(playlist.id)}>Delete</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;