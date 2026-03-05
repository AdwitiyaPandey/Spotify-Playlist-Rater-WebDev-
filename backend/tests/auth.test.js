const request = require("supertest");
const bcrypt = require("bcrypt");

jest.mock("../db", () => ({
  query: jest.fn()
}));

const pool = require("../db");
const app = require("../src/app");

describe("Auth routes", () => {
  let hashedAdminPassword;

  beforeAll(async () => {
    hashedAdminPassword = await bcrypt.hash("@dmin_0987", 10);
  });

  beforeEach(() => {
    pool.query.mockReset();
  });

  test("POST /api/auth/register creates a new user", async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes("SELECT id FROM users WHERE username = $1 LIMIT 1")) return { rows: [{ id: 1 }] };
      if (sql.includes("UPDATE users")) return { rows: [] };
      if (sql.includes("SELECT id FROM users WHERE email = $1 OR username = $2")) return { rows: [] };
      if (sql.includes("INSERT INTO users (username, email, password) VALUES")) {
        return { rows: [{ id: 2, username: "john", email: "john@example.com", password: "hashed" }] };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "john", email: "john@example.com", password: "secret123" });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("john");
    expect(res.body.email).toBe("john@example.com");
    expect(res.body.password).toBeUndefined();
  });

  test("POST /api/auth/login accepts username", async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes("SELECT id FROM users WHERE username = $1 LIMIT 1")) return { rows: [{ id: 1 }] };
      if (sql.includes("UPDATE users")) return { rows: [] };
      if (sql.includes("SELECT * FROM users WHERE email = $1 OR username = $1")) {
        return {
          rows: [
            {
              id: 1,
              username: "admin123",
              email: "admin123@local.admin",
              password: hashedAdminPassword,
              is_admin: true
            }
          ]
        };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin123", password: "@dmin_0987" });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("admin123");
    expect(res.body.is_admin).toBe(true);
    expect(res.body.password).toBeUndefined();
  });
});
