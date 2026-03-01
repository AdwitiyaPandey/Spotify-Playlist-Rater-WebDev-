const router = require("express").Router();
const axios = require("axios");
const pool = require("../db");

let accessToken = "";

async function getToken() {
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
  const match = url?.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
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

function generateAiFeedback({ playlistName, rating, topGenre, totalTracks, artistCount }) {
  if (rating >= 8) {
    return `AI review: \"${playlistName}\" scores ${rating}/10 with strong curation. The ${topGenre} influence is clear, and ${artistCount} artists across ${totalTracks} tracks keeps it fresh without losing identity.`;
  }

  if (rating >= 5) {
    return `AI review: \"${playlistName}\" is a solid ${rating}/10 foundation. The ${topGenre} core works, but adding a few contrasting artists could improve progression and replay value.`;
  }

  return `AI review: \"${playlistName}\" currently lands at ${rating}/10. Try tightening around one mood, reducing filler tracks, and balancing familiar picks with standout songs to raise engagement.`;
}

async function ensurePlaylistsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS playlists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      name TEXT,
      playlist_url TEXT,
      rating INTEGER,
      top_genre TEXT,
      feedback TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
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
      ["name", payload.name],
      ["playlist_url", payload.playlistUrl],
      ["rating", payload.rating],
      ["top_genre", payload.topGenre],
      ["feedback", payload.feedback]
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
    const { playlistUrl, userId } = req.body;
    const playlistId = getPlaylistId(playlistUrl);

    if (!playlistId) {
      return res.status(400).json({ message: "Invalid Spotify playlist URL" });
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

    const feedback = generateAiFeedback({
      playlistName,
      rating,
      topGenre,
      totalTracks: tracks.length,
      artistCount: allArtists.size
    });

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
      name: playlistName,
      playlistUrl,
      rating,
      topGenre,
      feedback
    });

    res.json({
      playlistName,
      rating,
      topGenre,
      feedback,
      recommendations
    });
  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json({ message: "Failed to analyze playlist" });
  }
});

router.get("/history/:userId", async (req, res) => {
  try {
    await ensurePlaylistsTable();

    const history = await pool.query(
      `
        SELECT id, name, playlist_url, rating, top_genre, feedback, created_at
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