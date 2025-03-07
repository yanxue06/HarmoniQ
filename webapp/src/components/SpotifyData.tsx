import { useState, useEffect } from 'react';
import spotifyApi from '../lib/spotify';
import './SpotifyData.css';

interface SpotifyDataProps {
  isLoggedIn: boolean;
}

const SpotifyData = ({ isLoggedIn }: SpotifyDataProps) => {
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]); // New state for top albums
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tracks' | 'artists' | 'recent' | 'albums'>('tracks');

  useEffect(() => {
    if (isLoggedIn) {
      fetchSpotifyData();
    }
  }, [isLoggedIn]);

  const fetchSpotifyData = async () => {
    if (!isLoggedIn) return;

    setLoading(true);
    setError(null);

    console.log('Fetching Spotify data...');

    try {
      // Fetch top tracks
      console.log('Fetching top tracks...');
      try {
        const tracksResponse = await spotifyApi.getTopTracks('medium_term', 10);
        console.log('Top tracks response:', tracksResponse);
        setTopTracks(tracksResponse.items || []);
      } catch (trackErr) {
        console.error('Error fetching top tracks:', trackErr);
        setError(`Error fetching top tracks: ${trackErr instanceof Error ? trackErr.message : 'Unknown error'}`);
      }

      // Fetch top artists
      console.log('Fetching top artists...');
      try {
        const artistsResponse = await spotifyApi.getTopArtists('medium_term', 10);
        console.log('Top artists response:', artistsResponse);
        setTopArtists(artistsResponse.items || []);
      } catch (artistErr) {
        console.error('Error fetching top artists:', artistErr);
        if (!error) {
          setError(`Error fetching top artists: ${artistErr instanceof Error ? artistErr.message : 'Unknown error'}`);
        }
      }

      // Fetch recently played
      console.log('Fetching recently played...');
      try {
        const recentResponse = await spotifyApi.getRecentlyPlayed(10);
        console.log('Recently played response:', recentResponse);
        setRecentlyPlayed(recentResponse.items || []);
      } catch (recentErr) {
        console.error('Error fetching recently played:', recentErr);
        if (!error) {
          setError(`Error fetching recently played: ${recentErr instanceof Error ? recentErr.message : 'Unknown error'}`);
        }
      }

      // Aggregate top albums from top tracks and recently played
      const allTracks = [
        ...topTracks.map(track => ({ album: track.album, source: 'topTracks' })),
        ...recentlyPlayed.map(item => ({ album: item.track.album, source: 'recentlyPlayed' })),
      ];

      // Count album frequencies
      const albumCountMap: { [key: string]: { album: any, count: number } } = {};
      allTracks.forEach(({ album }) => {
        if (album) {
          const albumId = album.id;
          if (!albumCountMap[albumId]) {
            albumCountMap[albumId] = { album, count: 0 };
          }
          albumCountMap[albumId].count += 1;
        }
      });

      // Convert to array and sort by count (descending)
      const topAlbumsArray = Object.values(albumCountMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Limit to top 10 albums

      console.log('Top albums:', topAlbumsArray);
      setTopAlbums(topAlbumsArray.map(item => item.album));
    } catch (err) {
      console.error('Error fetching Spotify data:', err);
      setError('Failed to load Spotify data. You might need to log in again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="spotify-data-container">
      <h2>Your Spotify Data</h2>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading your Spotify data...</div>
      ) : (
        <>
          <div className="tabs">
            <button
              className={activeTab === 'tracks' ? 'active' : ''}
              onClick={() => setActiveTab('tracks')}
            >
              Top Tracks
            </button>
            <button
              className={activeTab === 'artists' ? 'active' : ''}
              onClick={() => setActiveTab('artists')}
            >
              Top Artists
            </button>
            <button
              className={activeTab === 'recent' ? 'active' : ''}
              onClick={() => setActiveTab('recent')}
            >
              Recently Played
            </button>
            <button
              className={activeTab === 'albums' ? 'active' : ''}
              onClick={() => setActiveTab('albums')}
            >
              Top Albums
            </button>
          </div>

          <div className="content">
            {activeTab === 'tracks' && (
              <div className="tracks-list">
                <h3>Your Top Tracks</h3>
                {topTracks.length === 0 ? (
                  <p>No top tracks found.</p>
                ) : (
                  <ul>
                    {topTracks.map(track => (
                      <li key={track.id} className="track-item">
                        {track.album?.images?.[0]?.url && (
                          <img
                            src={track.album.images[0].url}
                            alt={track.album.name}
                            className="track-image"
                          />
                        )}
                        <div className="track-info">
                          <p className="track-name">{track.name}</p>
                          <p className="track-artist">
                            {track.artists.map((artist: any) => artist.name).join(', ')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'artists' && (
              <div className="artists-list">
                <h3>Your Top Artists</h3>
                {topArtists.length === 0 ? (
                  <p>No top artists found.</p>
                ) : (
                  <ul>
                    {topArtists.map(artist => (
                      <li key={artist.id} className="artist-item">
                        {artist.images?.[0]?.url && (
                          <img
                            src={artist.images[0].url}
                            alt={artist.name}
                            className="artist-image"
                          />
                        )}
                        <div className="artist-info">
                          <p className="artist-name">{artist.name}</p>
                          <p className="artist-genres">
                            {artist.genres.slice(0, 3).join(', ')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'recent' && (
              <div className="recent-list">
                <h3>Recently Played</h3>
                {recentlyPlayed.length === 0 ? (
                  <p>No recently played tracks found.</p>
                ) : (
                  <ul>
                    {recentlyPlayed.map(item => (
                      <li key={item.played_at} className="recent-item">
                        {item.track.album?.images?.[0]?.url && (
                          <img
                            src={item.track.album.images[0].url}
                            alt={item.track.album.name}
                            className="recent-image"
                          />
                        )}
                        <div className="recent-info">
                          <p className="recent-name">{item.track.name}</p>
                          <p className="recent-artist">
                            {item.track.artists.map((artist: any) => artist.name).join(', ')}
                          </p>
                          <p className="recent-time">
                            {new Date(item.played_at).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'albums' && (
              <div className="albums-list">
                <h3>Your Top Albums</h3>
                {topAlbums.length === 0 ? (
                  <p>No top albums found.</p>
                ) : (
                  <ul>
                    {topAlbums.map(album => (
                      <li key={album.id} className="album-item">
                        {album.images?.[0]?.url && (
                          <img
                            src={album.images[0].url}
                            alt={album.name}
                            className="album-image"
                          />
                        )}
                        <div className="album-info">
                          <p className="album-name">{album.name}</p>
                          <p className="album-artist">
                            {album.artists.map((artist: any) => artist.name).join(', ')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            onClick={fetchSpotifyData}
            className="refresh-button"
          >
            Refresh Data
          </button>
        </>
      )}
    </div>
  );
};

export default SpotifyData;