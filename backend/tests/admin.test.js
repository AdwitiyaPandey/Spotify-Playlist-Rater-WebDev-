const request = require("supertest");

jest.mock("../db", () => ({
  query: jest.fn()
}));

const pool = require("../db");
const app = require("../src/app");

describe("Admin routes", () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  describe("GET /api/admin/users", () => {
    test("returns list of users", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("SELECT id, username, email FROM users")) {
          return {
            rows: [
              { id: 1, username: "alice", email: "alice@example.com" },
              { id: 2, username: "bob", email: "bob@example.com" }
            ]
          };
        }
        return { rows: [] };
      });

      const res = await request(app).get("/api/admin/users");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].username).toBe("alice");
      expect(res.body[1].username).toBe("bob");
    });

    test("returns 500 on database error", async () => {
      pool.query.mockRejectedValue(new Error("DB connection failed"));

      const res = await request(app).get("/api/admin/users");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to fetch users");
    });
  });

  describe("GET /api/admin/playlists", () => {
    test("returns list of playlists", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("SELECT * FROM playlists ORDER BY id DESC")) {
          return {
            rows: [
              { id: 1, name: "Chill Vibes", rating: 8, top_genre: "pop" },
              { id: 2, name: "Workout Mix", rating: 7, top_genre: "hip-hop" }
            ]
          };
        }
        return { rows: [] };
      });

      const res = await request(app).get("/api/admin/playlists");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe("Chill Vibes");
    });

    test("returns 500 on database error", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        throw new Error("DB error");
      });

      const res = await request(app).get("/api/admin/playlists");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to fetch playlists");
    });
  });

  describe("GET /api/admin/stats", () => {
    test("returns aggregated stats", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("ALTER TABLE")) return { rows: [] };
        if (sql.includes("COUNT(*)::int AS count FROM users")) {
          return { rows: [{ count: 10 }] };
        }
        if (sql.includes("COUNT(*)::int AS count FROM playlists")) {
          return { rows: [{ count: 25 }] };
        }
        if (sql.includes("AVG(rating)")) {
          return { rows: [{ avg_rating: 7.5 }] };
        }
        return { rows: [] };
      });

      const res = await request(app).get("/api/admin/stats");

      expect(res.status).toBe(200);
      expect(res.body.usersCount).toBe(10);
      expect(res.body.playlistsCount).toBe(25);
      expect(res.body.avgRating).toBe(7.5);
    });

    test("returns 500 on database error", async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("ALTER TABLE")) return { rows: [] };
        throw new Error("DB error");
      });

      const res = await request(app).get("/api/admin/stats");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to fetch stats");
    });
  });

  describe("DELETE /api/admin/users/:id", () => {
    test("deletes a user by id", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const res = await request(app).delete("/api/admin/users/5");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User deleted");
      expect(pool.query).toHaveBeenCalledWith(
        "DELETE FROM users WHERE id = $1",
        ["5"]
      );
    });

    test("returns 500 on database error", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));

      const res = await request(app).delete("/api/admin/users/5");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to delete user");
    });
  });

  describe("DELETE /api/admin/playlists/:id", () => {
    test("deletes a playlist by id", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const res = await request(app).delete("/api/admin/playlists/3");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Playlist deleted");
      expect(pool.query).toHaveBeenCalledWith(
        "DELETE FROM playlists WHERE id = $1",
        ["3"]
      );
    });

    test("returns 500 on database error", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));

      const res = await request(app).delete("/api/admin/playlists/3");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to delete playlist");
    });
  });
});
