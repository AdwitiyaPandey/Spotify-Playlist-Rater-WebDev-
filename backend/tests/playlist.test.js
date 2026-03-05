const request = require("supertest");

jest.mock("../db", () => ({
  query: jest.fn()
}));

const pool = require("../db");
const app = require("../src/app");

describe("Playlist routes", () => {
  beforeEach(() => {
    pool.query.mockReset();

    pool.query.mockImplementation(async (sql) => {
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

      if (sql.includes("SELECT id, name, playlist_url, rating, top_genre, created_at") && sql.includes("WHERE user_id = $1")) {
        return {
          rows: [
            {
              id: 1,
              name: "Playlist 37i9dQ",
              playlist_url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
              rating: 6,
              top_genre: "hip-hop",
              created_at: new Date().toISOString()
            }
          ]
        };
      }

      return { rows: [] };
    });

    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
  });

  test("POST /api/playlist/analyze returns fallback payload", async () => {
    const res = await request(app)
      .post("/api/playlist/analyze")
      .send({
        playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
        userId: 9,
        userEmail: "testuser_reg2@example.com"
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("rating");
    expect(res.body).toHaveProperty("topGenre");
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });

  test("GET /api/playlist/history returns user rows", async () => {
    const res = await request(app).get("/api/playlist/history?userId=9&email=testuser_reg2@example.com");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("rating");
  });
});
