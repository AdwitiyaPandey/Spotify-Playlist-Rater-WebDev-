const request = require("supertest");

jest.mock("../db", () => ({
  query: jest.fn()
}));

jest.mock("axios");

const pool = require("../db");
const axios = require("axios");
const app = require("../src/app");

describe("Playlist routes - extended coverage", () => {
  beforeEach(() => {
    pool.query.mockReset();
    axios.post.mockReset();
    axios.get.mockReset();

    pool.query.mockImplementation(async (sql) => {
      if (sql.includes("CREATE TABLE")) return { rows: [] };
      if (sql.includes("ALTER TABLE")) return { rows: [] };
      if (sql.includes("information_schema.columns")) {
        return {
          rows: [
            { column_name: "user_id" },
            { column_name: "user_email" },
            { column_name: "name" },
            { column_name: "playlist_url" },
            { column_name: "rating" },
            { column_name: "top_genre" },
            { column_name: "created_at" }
          ]
        };
      }
      if (sql.includes("INSERT INTO playlists")) return { rows: [] };
      return { rows: [] };
    });

    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
  });

  describe("POST /api/playlist/analyze", () => {
    test("returns 400 for invalid playlist URL", async () => {
      const res = await request(app)
        .post("/api/playlist/analyze")
        .send({ playlistUrl: "not-a-valid-url" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid Spotify playlist URL");
    });

    test("returns 400 for empty playlist URL", async () => {
      const res = await request(app)
        .post("/api/playlist/analyze")
        .send({ playlistUrl: "" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid Spotify playlist URL");
    });

    test("parses spotify URI format", async () => {
      const res = await request(app)
        .post("/api/playlist/analyze")
        .send({ playlistUrl: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("rating");
      expect(res.body).toHaveProperty("topGenre");
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    });

    test("fallback analysis produces consistent results for same input", async () => {
      const playlistUrl = "https://open.spotify.com/playlist/abc123def456";

      const res1 = await request(app)
        .post("/api/playlist/analyze")
        .send({ playlistUrl });

      const res2 = await request(app)
        .post("/api/playlist/analyze")
        .send({ playlistUrl });

      expect(res1.body.rating).toBe(res2.body.rating);
      expect(res1.body.topGenre).toBe(res2.body.topGenre);
    });

    test("returns fallback when Spotify credentials are missing", async () => {
      const res = await request(app)
        .post("/api/playlist/analyze")
        .send({
          playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
          userId: 1,
          userEmail: "user@example.com"
        });

      expect(res.status).toBe(200);
      expect(res.body.rating).toBeGreaterThanOrEqual(5);
      expect(res.body.rating).toBeLessThanOrEqual(9);
      expect(res.body.recommendations).toHaveLength(3);
    });

    test("uses Spotify API when credentials are set", async () => {
      process.env.SPOTIFY_CLIENT_ID = "test_id";
      process.env.SPOTIFY_CLIENT_SECRET = "test_secret";

      axios.post.mockResolvedValue({
        data: { access_token: "mock_token" }
      });

      axios.get.mockImplementation(async (url) => {
        if (url.includes("/v1/playlists/")) {
          return {
            data: {
              name: "Test Playlist",
              tracks: {
                items: [
                  { track: { id: "track1", artists: [{ id: "artist1" }] } },
                  { track: { id: "track2", artists: [{ id: "artist2" }] } }
                ]
              }
            }
          };
        }
        if (url.includes("/v1/artists")) {
          return {
            data: {
              artists: [
                { genres: ["pop", "indie"] },
                { genres: ["rock", "alternative"] }
              ]
            }
          };
        }
        if (url.includes("/v1/recommendations")) {
          return {
            data: {
              tracks: [
                { name: "Song A", artists: [{ name: "Artist A" }] },
                { name: "Song B", artists: [{ name: "Artist B" }] }
              ]
            }
          };
        }
        return { data: {} };
      });

      const res = await request(app)
        .post("/api/playlist/analyze")
        .send({
          playlistUrl: "https://open.spotify.com/playlist/testPlaylist123",
          userId: 1,
          userEmail: "user@example.com"
        });

      expect(res.status).toBe(200);
      expect(res.body.playlistName).toBe("Test Playlist");
      expect(res.body).toHaveProperty("rating");
      expect(res.body).toHaveProperty("topGenre");
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    });

    test("returns 400 when playlist has no tracks", async () => {
      process.env.SPOTIFY_CLIENT_ID = "test_id";
      process.env.SPOTIFY_CLIENT_SECRET = "test_secret";

      axios.post.mockResolvedValue({
        data: { access_token: "mock_token" }
      });

      axios.get.mockResolvedValue({
        data: {
          name: "Empty Playlist",
          tracks: { items: [] }
        }
      });

      const res = await request(app)
        .post("/api/playlist/analyze")
        .send({
          playlistUrl: "https://open.spotify.com/playlist/emptyList123"
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Playlist has no analyzable tracks");
    });

    test("returns 500 when Spotify API fails", async () => {
      process.env.SPOTIFY_CLIENT_ID = "test_id";
      process.env.SPOTIFY_CLIENT_SECRET = "test_secret";

      axios.post.mockRejectedValue(new Error("Network error"));

      const res = await request(app)
        .post("/api/playlist/analyze")
        .send({
          playlistUrl: "https://open.spotify.com/playlist/somePlaylist123"
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to analyze playlist");
    });
  });

  describe("GET /api/playlist/history", () => {
    test("returns history by email when userId returns empty", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("ALTER TABLE")) return { rows: [] };
        if (sql.includes("WHERE user_id = $1")) return { rows: [] };
        if (sql.includes("WHERE user_email = $1")) {
          return {
            rows: [
              { id: 1, name: "My Mix", playlist_url: "url", rating: 7, top_genre: "pop", created_at: "2024-01-01" }
            ]
          };
        }
        return { rows: [] };
      });

      const res = await request(app).get("/api/playlist/history?userId=99&email=test@example.com");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("My Mix");
    });

    test("returns recent playlists when no userId or email match", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("ALTER TABLE")) return { rows: [] };
        if (sql.includes("WHERE user_id = $1")) return { rows: [] };
        if (sql.includes("WHERE user_email = $1")) return { rows: [] };
        if (sql.includes("LIMIT 20")) {
          return {
            rows: [
              { id: 5, name: "Recent", playlist_url: "url", rating: 9, top_genre: "rock", created_at: "2024-01-01" }
            ]
          };
        }
        return { rows: [] };
      });

      const res = await request(app).get("/api/playlist/history?userId=99&email=nobody@example.com");

      expect(res.status).toBe(200);
      expect(res.body[0].name).toBe("Recent");
    });

    test("returns history without userId param", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("ALTER TABLE")) return { rows: [] };
        if (sql.includes("WHERE user_email = $1")) {
          return {
            rows: [{ id: 1, name: "Playlist", playlist_url: "url", rating: 6, top_genre: "indie", created_at: "2024-01-01" }]
          };
        }
        if (sql.includes("LIMIT 20")) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      const res = await request(app).get("/api/playlist/history?email=test@example.com");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test("returns 500 on database error", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("ALTER TABLE")) return { rows: [] };
        throw new Error("DB error");
      });

      const res = await request(app).get("/api/playlist/history?userId=1");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to fetch history");
    });
  });

  describe("GET /api/playlist/history/:userId", () => {
    test("returns history for a specific user", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("ALTER TABLE")) return { rows: [] };
        if (sql.includes("WHERE user_id = $1")) {
          return {
            rows: [
              { id: 1, name: "User Playlist", playlist_url: "url", rating: 8, top_genre: "electronic", created_at: "2024-01-01" }
            ]
          };
        }
        return { rows: [] };
      });

      const res = await request(app).get("/api/playlist/history/7");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("User Playlist");
    });

    test("returns empty array when user has no history", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("ALTER TABLE")) return { rows: [] };
        return { rows: [] };
      });

      const res = await request(app).get("/api/playlist/history/999");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    test("returns 500 on database error", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("ALTER TABLE")) return { rows: [] };
        throw new Error("DB error");
      });

      const res = await request(app).get("/api/playlist/history/1");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to fetch history");
    });
  });
});
