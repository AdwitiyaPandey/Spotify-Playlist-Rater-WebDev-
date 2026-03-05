import { useState } from "react";
import { useEffect } from "react";
import { useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

const API_BASE = "http://localhost:5000/api";

function Dashboard() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("analyze");

  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("authUser") || "null");
  } catch {
    user = null;
  }

  const getErrorMessage = (err, fallback) => {
    const responseData = err.response?.data;
    if (typeof responseData === "string") return responseData;
    if (responseData?.message) return responseData.message;
    return fallback;
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/playlist/history`, {
        params: {
          userId: user?.id,
          email: user?.email
        }
      });
      setHistory(res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to fetch your rating history"));
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const logout = () => {
    localStorage.removeItem("authUser");
    navigate("/login");
  };

  const analyze = async () => {
    if (!url.trim()) {
      setError("Please paste a playlist URL");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/playlist/analyze`,
        {
          playlistUrl: url,
          userId: user?.id || null,
          userEmail: user?.email || null
        },
        {
          timeout: 10000
        }
      );
      setResult(res.data);
      setActiveView("analyze");
      fetchHistory();
    } catch (err) {
      setError(getErrorMessage(err, "Error analyzing playlist"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2 className="logo">Playlist Rater</h2>
        <p className="sidebar-user">{user?.username || user?.email || "Listener"}</p>

        <nav>
          <button
            className={`nav-btn ${activeView === "analyze" ? "active" : ""}`}
            onClick={() => setActiveView("analyze")}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${activeView === "history" ? "active" : ""}`}
            onClick={() => {
              setActiveView("history");
              fetchHistory();
            }}
          >
            My Ratings
          </button>
          {user?.is_admin || user?.role === "admin" ? (
            <button className="nav-btn" onClick={() => navigate("/admin")}>
              Admin Panel
            </button>
          ) : null}
        </nav>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <h1 className="dashboard-title">Discover, Rate, and Improve Your Playlists</h1>

        {error ? <p className="dashboard-error">{error}</p> : null}

        {activeView === "analyze" ? (
          <>
            <div className="analyzer-card">
              <h2>Analyze Playlist</h2>

              <div className="input-area">
                <input
                  placeholder="Paste Spotify Playlist URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />

                <button onClick={analyze} disabled={loading}>
                  {loading ? "Analyzing..." : "Rate Playlist"}
                </button>
              </div>
            </div>

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
                    {result.recommendations?.map((song, i) => (
                      <li key={i}>
                        {song.name} - {song.artist}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="history-card">
              <h2>Recently Rated Playlists</h2>
              {historyLoading ? <p>Loading history...</p> : null}
              {!historyLoading && history.length === 0 ? <p>No playlists rated yet.</p> : null}
              <div className="history-list">
                {history.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="history-item">
                    <h3>{entry.name || "Untitled Playlist"}</h3>
                    <p>
                      Score: <strong>{entry.rating}/10</strong>
                    </p>
                    <p>Top Genre: {entry.top_genre || "Unknown"}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="history-card">
            <h2>My Ratings History</h2>
            {historyLoading ? <p>Loading history...</p> : null}

            {!historyLoading && history.length === 0 ? (
              <p>No playlist ratings yet. Analyze your first playlist.</p>
            ) : null}

            <div className="history-list">
              {history.map((entry) => (
                <div key={entry.id} className="history-item">
                  <h3>{entry.name || "Untitled Playlist"}</h3>
                  <p>
                    Score: <strong>{entry.rating}/10</strong>
                  </p>
                  <p>Top Genre: {entry.top_genre || "Unknown"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;