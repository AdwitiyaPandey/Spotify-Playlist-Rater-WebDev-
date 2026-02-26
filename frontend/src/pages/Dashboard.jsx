import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

function Dashboard() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("authUser");
    navigate("/login");
  };

  const analyze = async () => {
    if (!url) return alert("Please paste a playlist URL");

    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/playlist/analyze",
        { playlistUrl: url }
      );
      setResult(res.data);
    } catch (err) {
      alert("Error analyzing playlist");
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-container">

      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">Playlist Rater</h2>

        <nav>
          <button className="nav-btn active">Dashboard</button>
          <button className="nav-btn">My Ratings</button>
          <button className="nav-btn">Profile</button>
        </nav>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">

        <h1 className="dashboard-title">
          Discover & Rate Playlists
        </h1>

        {/* Input Card */}
        <div className="analyzer-card">

          <h2>Analyze Playlist</h2>

          <div className="input-area">
            <input
              placeholder="Paste Spotify Playlist URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            <button onClick={analyze}>
              {loading ? "Analyzing..." : "Rate Playlist"}
            </button>
          </div>
        </div>

        {/* Result Card */}
        {result && (
          <div className="result-card">

            <div className="rating-box">
              <h2>Rating</h2>
              <p>{result.rating}/10</p>
            </div>

            <div className="genre-box">
              <h2>Top Genre</h2>
              <p>{result.topGenre}</p>
            </div>

            <div className="recommend-box">
              <h2>Recommended Songs</h2>

              <ul>
                {result.recommendations.map((song, i) => (
                  <li key={i}>
                    🎵 {song.name} – {song.artist}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default Dashboard;