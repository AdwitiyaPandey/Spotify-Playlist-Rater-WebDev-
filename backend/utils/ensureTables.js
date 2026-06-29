const pool = require("../db");

async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
}

async function ensurePlaylistsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS playlists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      user_email TEXT,
      name TEXT,
      playlist_url TEXT,
      rating INTEGER,
      top_genre TEXT,
      feedback TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS user_id INTEGER");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS user_email TEXT");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS name TEXT");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS playlist_url TEXT");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS rating INTEGER");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS top_genre TEXT");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS feedback TEXT");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
}

module.exports = { ensureUsersTable, ensurePlaylistsTable };
