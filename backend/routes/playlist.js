const router = require("express").Router();
const axios = require("axios");

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
  return url.split("playlist/")[1].split("?")[0];
}

router.post("/analyze", async (req, res) => {
  try {
    const { playlistUrl } = req.body;

    await getToken();
    const playlistId = getPlaylistId(playlistUrl);

    // Getting playlist details and tracks
    const playlistRes = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const tracks = playlistRes.data.tracks.items;

    let genreCount = {};
    let allArtists = new Set();

    tracks.forEach(item => {
      item.track.artists.forEach(artist => {
        allArtists.add(artist.id);
      });
    });

    // getting artist generas from the playlist
    const artistIds = Array.from(allArtists).slice(0, 50).join(",");
    const artistRes = await axios.get(
      `https://api.spotify.com/v1/artists?ids=${artistIds}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    artistRes.data.artists.forEach(artist => {
      artist.genres.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    });

    // Finding  the top/common genre in the playlist
    const sortedGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
    const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : "Unknown";

    // Calculating rating
    const rating = Math.min(10, Math.round(tracks.length / 4));

    // Disging out recommendations
    const recRes = await axios.get(
      `https://api.spotify.com/v1/recommendations?limit=5&seed_genres=${topGenre}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const recommendations = recRes.data.tracks.map(track => ({
      name: track.name,
      artist: track.artists[0].name
    }));

    res.json({
      rating,
      topGenre,
      recommendations
    });

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json("Failed to analyze playlist");
  }
});

module.exports = router;