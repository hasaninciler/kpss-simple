const router = require('express').Router();
const axios = require('axios');
const auth = require('../middleware/auth');

const YT_KEY = process.env.YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

// Playlist'teki tüm videoları getir
async function fetchPlaylistVideos(playlistId) {
  const videos = [];
  let pageToken = '';

  do {
    const { data } = await axios.get(`${BASE}/playlistItems`, {
      params: {
        key: YT_KEY,
        playlistId,
        part: 'snippet,contentDetails',
        maxResults: 50,
        ...(pageToken && { pageToken }),
      },
    });

    for (const item of data.items) {
      const snippet = item.snippet;
      if (snippet.title === 'Private video' || snippet.title === 'Deleted video') continue;
      videos.push({
        id: snippet.resourceId.videoId,
        title: snippet.title,
        thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
        description: snippet.description?.slice(0, 100) || '',
        position: snippet.position,
      });
    }

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return videos;
}

// GET /api/youtube/playlist/:playlistId
router.get('/playlist/:playlistId', auth, async (req, res) => {
  const { playlistId } = req.params;

  if (!YT_KEY) {
    return res.status(500).json({ error: 'YouTube API key ayarlanmamış' });
  }

  try {
    // Önce playlist bilgisi
    const { data: plData } = await axios.get(`${BASE}/playlists`, {
      params: {
        key: YT_KEY,
        id: playlistId,
        part: 'snippet',
      },
    });

    const playlist = plData.items?.[0];
    if (!playlist) return res.status(404).json({ error: 'Playlist bulunamadı' });

    const videos = await fetchPlaylistVideos(playlistId);

    res.json({
      id: playlistId,
      title: playlist.snippet.title,
      thumbnail: playlist.snippet.thumbnails?.medium?.url || '',
      videoCount: videos.length,
      videos,
    });
  } catch (e) {
    console.error('YouTube API error:', e.response?.data || e.message);
    res.status(500).json({ error: 'YouTube API hatası: ' + (e.response?.data?.error?.message || e.message) });
  }
});

module.exports = router;
