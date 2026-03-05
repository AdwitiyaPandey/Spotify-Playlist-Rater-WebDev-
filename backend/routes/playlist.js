const router = require("express").Router();
const axios = require("axios");
const pool = require("../db");

let accessToken = "";

const fallbackGenres = ["pop", "hip-hop", "indie", "rock", "electronic", "r-n-b"];

function hasSpotifyCredentials() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getFallbackRecommendations(topGenre) {
  const recommendationsByGenre = {
    pop: [
      { name: "Levitating", artist: "Dua Lipa" },
      { name: "Blinding Lights", artist: "The Weeknd" },
      { name: "As It Was", artist: "Harry Styles" }
    ],
    "hip-hop": [
      { name: "SICKO MODE", artist: "Travis Scott" },
      { name: "HUMBLE.", artist: "Kendrick Lamar" },
      { name: "Nonstop", artist: "Drake" }
    ],
    indie: [
      { name: "Do I Wanna Know?", artist: "Arctic Monkeys" },
      { name: "The Less I Know The Better", artist: "Tame Impala" },
      { name: "Space Song", artist: "Beach House" }
    ],
    rock: [
      { name: "Dream On", artist: "Aerosmith" },
      { name: "Bohemian Rhapsody", artist: "Queen" },
      { name: "Seven Nation Army", artist: "The White Stripes" }
    ],
    electronic: [
      { name: "Strobe", artist: "deadmau5" },
      { name: "Titanium", artist: "David Guetta" },
      { name: "Animals", artist: "Martin Garrix" }
    ],
    "r-n-b": [
      { name: "Die For You", artist: "The Weeknd" },
      { name: "Snooze", artist: "SZA" },
      { name: "Adorn", artist: "Miguel" }
    ]
  };

  return recommendationsByGenre[topGenre] || recommendationsByGenre.pop;
}

function buildFallbackAnalysis(playlistId, playlistUrl) {
  const hash = hashText(playlistId || playlistUrl || "playlist");
  const rating = 5 + (hash % 5);
  const topGenre = fallbackGenres[hash % fallbackGenres.length];
  const playlistName = `Playlist ${String(playlistId || "mix").slice(0, 6)}`;

  return {
    playlistName,
    rating,
    topGenre,
    recommendations: getFallbackRecommendations(topGenre)
  };
}

async function getToken() {
  if (!hasSpotifyCredentials()) {
    throw new Error("SPOTIFY_CREDENTIALS_MISSING");
  }

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.SPOTIFY_CLIENT_ID +
              ":" +
              process.env.SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
      },
    }
  );

  accessToken = response.data.access_token;
}

function getPlaylistId(url) {
  const webMatch = url?.match(/playlist\/([a-zA-Z0-9]+)/);
  if (webMatch) return webMatch[1];

  const uriMatch = url?.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  return uriMatch ? uriMatch[1] : null;
}

function normalizeGenreForSeed(rawGenre) {
  if (!rawGenre) return null;

  const sanitized = rawGenre
    .toLowerCase()
    .replace(/[^a-z\s-]/g, "")
    .trim();

  const genreMap = {
    "hip hop": "hip-hop",
    soundtrack: "soundtracks",
    rnb: "r-n-b",
    "drum and bass": "drum-and-bass"
  };

  return genreMap[sanitized] || sanitized.replace(/\s+/g, "-");
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

  // Keep older local schemas in sync so history and inserts always work.
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS user_id INTEGER");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS user_email TEXT");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS name TEXT");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS playlist_url TEXT");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS rating INTEGER");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS top_genre TEXT");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS feedback TEXT");
  await pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
}

async function savePlaylistAnalysis(payload) {
  try {
    await ensurePlaylistsTable();

    const columnsRes = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'playlists'
      `
    );

    const availableColumns = new Set(columnsRes.rows.map((row) => row.column_name));

    const candidate = [
      ["user_id", payload.userId ?? null],
      ["user_email", payload.userEmail ?? null],
      ["name", payload.name],
      ["playlist_url", payload.playlistUrl],
      ["rating", payload.rating],
      ["top_genre", payload.topGenre]
    ].filter(([column]) => availableColumns.has(column));

    if (candidate.length === 0) return;

    const columns = candidate.map(([column]) => column);
    const values = candidate.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    await pool.query(
      `INSERT INTO playlists (${columns.join(", ")}) VALUES (${placeholders})`,
      values
    );
  } catch (dbError) {
    console.error("Failed to save playlist analysis:", dbError.message);
  }
}

router.post("/analyze", async (req, res) => {
  try {
    const { playlistUrl, userId, userEmail } = req.body;
    const playlistId = getPlaylistId(playlistUrl);

    if (!playlistId) {
      return res.status(400).json({ message: "Invalid Spotify playlist URL" });
    }

    if (!hasSpotifyCredentials()) {
      const fallback = buildFallbackAnalysis(playlistId, playlistUrl);

      await savePlaylistAnalysis({
        userId,
        userEmail,
        name: fallback.playlistName,
        playlistUrl,
        rating: fallback.rating,
        topGenre: fallback.topGenre
      });

      return res.json(fallback);
    }

    await getToken();

    const playlistRes = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const playlistName = playlistRes.data.name || "Untitled Playlist";
    const tracks = (playlistRes.data.tracks?.items || []).filter((item) => item?.track?.id);

    if (tracks.length === 0) {
      return res.status(400).json({ message: "Playlist has no analyzable tracks" });
    }

    let genreCount = {};
    let allArtists = new Set();

    tracks.forEach((item) => {
      item.track.artists.forEach((artist) => {
        allArtists.add(artist.id);
      });
    });

    const artistIds = Array.from(allArtists).slice(0, 50).join(",");
    if (artistIds) {
      const artistRes = await axios.get(
        `https://api.spotify.com/v1/artists?ids=${artistIds}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      artistRes.data.artists.forEach((artist) => {
        artist.genres.forEach((genre) => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      });
    }

    const sortedGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
    const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : "Unknown";

    const genreDiversity = Math.min(sortedGenres.length, 6);
    const artistSpreadScore = Math.min(4, Math.round(allArtists.size / 8));
    const trackScore = Math.min(4, Math.round(tracks.length / 8));
    const diversityScore = Math.min(2, Math.round(genreDiversity / 2));
    const rating = Math.min(10, Math.max(1, trackScore + artistSpreadScore + diversityScore));

    const trackSeeds = tracks
      .map((item) => item.track?.id)
      .filter(Boolean)
      .slice(0, 3)
      .join(",");

    const genreSeed = normalizeGenreForSeed(topGenre);
    let recommendationUrl = `https://api.spotify.com/v1/recommendations?limit=5`;

    if (trackSeeds) {
      recommendationUrl += `&seed_tracks=${trackSeeds}`;
    } else if (genreSeed) {
      recommendationUrl += `&seed_genres=${genreSeed}`;
    } else {
      recommendationUrl += `&seed_genres=pop`;
    }

    const recRes = await axios.get(recommendationUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const recommendations = recRes.data.tracks.map((track) => ({
      name: track.name,
      artist: track.artists[0].name
    }));

    await savePlaylistAnalysis({
      userId,
      userEmail,
      name: playlistName,
      playlistUrl,
      rating,
      topGenre
    });

    res.json({
      playlistName,
      rating,
      topGenre,
      recommendations
    });
  } catch (err) {
    console.log(err.response?.data || err.message);

    if (err.message === "SPOTIFY_CREDENTIALS_MISSING") {
      return res.status(500).json({
        message: "Spotify credentials are missing. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to backend/.env"
      });
    }

    res.status(500).json({ message: "Failed to analyze playlist" });
  }
});

router.get("/history", async (req, res) => {
  try {
    await ensurePlaylistsTable();

    const { userId, email } = req.query;
    let rows = [];

    if (userId) {
      const byUserId = await pool.query(
        `
          SELECT id, name, playlist_url, rating, top_genre, created_at
          FROM playlists
          WHERE user_id = $1
          ORDER BY created_at DESC
        `,
        [userId]
      );
      rows = byUserId.rows;
    }

    if (rows.length === 0 && email) {
      const byEmail = await pool.query(
        `
          SELECT id, name, playlist_url, rating, top_genre, created_at
          FROM playlists
          WHERE user_email = $1
          ORDER BY created_at DESC
        `,
        [email]
      );
      rows = byEmail.rows;
    }

    if (rows.length === 0) {
      const recent = await pool.query(
        `
          SELECT id, name, playlist_url, rating, top_genre, created_at
          FROM playlists
          ORDER BY created_at DESC
          LIMIT 20
        `
      );
      rows = recent.rows;
    }

    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch history:", err.message);
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

router.get("/history/:userId", async (req, res) => {
  try {
    await ensurePlaylistsTable();

    const history = await pool.query(
      `
        SELECT id, name, playlist_url, rating, top_genre, created_at
        FROM playlists
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [req.params.userId]
    );

    res.json(history.rows);
  } catch (err) {
    console.error("Failed to fetch history:", err.message);
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

module.exports = router;