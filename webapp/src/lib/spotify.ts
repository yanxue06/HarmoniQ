import { supabase } from './supabase';

const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1';

// Helper to get the current Spotify access token from Supabase session
const getSpotifyToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.provider_token || null;
};

// Generic fetch function for Spotify API
const spotifyFetch = async (endpoint: string, method: string = 'GET', body?: any) => {
  const token = await getSpotifyToken();
  
  console.log(`Spotify API call to ${endpoint}`);
  
  if (!token) {
    console.error('No Spotify access token available');
    throw new Error('No Spotify access token available. User may need to log in again.');
  }
  
  console.log(`Using token: ${token.substring(0, 10)}...`);
  
  try {
    const response = await fetch(`${SPOTIFY_BASE_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401) {
        console.error('Spotify token expired. User needs to log in again.');
        // You could trigger a logout here or refresh the token
      }
      const errorText = await response.text();
      console.error(`Spotify API error (${response.status}): ${errorText}`);
      throw new Error(`Spotify API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Spotify API response from ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`Error in Spotify API call to ${endpoint}:`, error);
    throw error;
  }
};

// Get the current user's profile
export const getCurrentUserProfile = async () => {
  return spotifyFetch('/me');
};

// Get the user's playlists
export const getUserPlaylists = async (limit: number = 20, offset: number = 0) => {
  return spotifyFetch(`/me/playlists?limit=${limit}&offset=${offset}`);
};

// Get the user's top artists
export const getTopArtists = async (timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 20) => {
  return spotifyFetch(`/me/top/artists?time_range=${timeRange}&limit=${limit}`);
};

// Get the user's top tracks
export const getTopTracks = async (timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 20) => {
  return spotifyFetch(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
};

// Get the user's recently played tracks
export const getRecentlyPlayed = async (limit: number = 20) => {
  return spotifyFetch(`/me/player/recently-played?limit=${limit}`);
};

// Get the user's currently playing track
export const getCurrentlyPlaying = async () => {
  return spotifyFetch('/me/player/currently-playing');
};

// Get a specific playlist by ID
export const getPlaylist = async (playlistId: string) => {
  return spotifyFetch(`/playlists/${playlistId}`);
};

// Get recommendations based on seed artists, tracks, or genres
export const getRecommendations = async (options: {
  seed_artists?: string[];
  seed_tracks?: string[];
  seed_genres?: string[];
  limit?: number;
}) => {
  const params = new URLSearchParams();
  
  if (options.seed_artists) params.append('seed_artists', options.seed_artists.join(','));
  if (options.seed_tracks) params.append('seed_tracks', options.seed_tracks.join(','));
  if (options.seed_genres) params.append('seed_genres', options.seed_genres.join(','));
  if (options.limit) params.append('limit', options.limit.toString());
  
  return spotifyFetch(`/recommendations?${params.toString()}`);
};

// Search for items (artists, albums, tracks, playlists)
export const search = async (query: string, types: ('artist' | 'album' | 'track' | 'playlist')[], limit: number = 20) => {
  return spotifyFetch(`/search?q=${encodeURIComponent(query)}&type=${types.join(',')}&limit=${limit}`);
};

// Get available genres for recommendations
export const getAvailableGenres = async () => {
  return spotifyFetch('/recommendations/available-genre-seeds');
};

export default {
  getCurrentUserProfile,
  getUserPlaylists,
  getTopArtists,
  getTopTracks,
  getRecentlyPlayed,
  getCurrentlyPlaying,
  getPlaylist,
  getRecommendations,
  search,
  getAvailableGenres
}; 