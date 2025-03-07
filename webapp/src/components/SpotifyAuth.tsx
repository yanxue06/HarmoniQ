// SpotifyAuth.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { signInWithSpotify, signOut, getSession, onAuthStateChange } from '../lib/supabase';
import './SpotifyAuth.css';

interface SpotifyAuthProps {
  onLogin?: (session: Session) => void;
  onLogout?: () => void;
}

const SpotifyAuth = ({ onLogin, onLogout }: SpotifyAuthProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const authListenerRef = useRef<{ subscription: { unsubscribe: () => void } } | null>(null);
  const initialCheckDoneRef = useRef(false);

  const handleSpotifyLogin = useCallback(async () => {
    try {
      console.log("Initiating Spotify login...");
      setLoading(true);
      setError(null);

      const redirectUrl = window.location.origin;
      console.log("Using redirect URL:", redirectUrl);

      const { data, error } = await signInWithSpotify(redirectUrl);

      if (error) {
        throw error;
      }

      if (data && data.url) {
        console.log("Redirecting to Spotify OAuth URL:", data.url);
        window.location.href = data.url; // Explicitly redirect to the OAuth URL
      } else {
        throw new Error("No redirect URL received from Supabase");
      }
    } catch (err) {
      console.error('Login error details:', err);
      if (isMounted.current) {
        setError(
          err instanceof Error
            ? `Failed to login with Spotify: ${err.message}`
            : 'Failed to login with Spotify due to an unknown error'
        );
        setLoading(false);
      }
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      console.log('Starting logout process');
      setLoading(true);
      const { error } = await signOut();

      if (error) {
        console.error('Logout error from Supabase:', error);
        throw error;
      }

      console.log('Logout successful, resetting session');
      if (isMounted.current) {
        setSession(null);
      }
    } catch (err) {
      console.error('Logout error:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to logout');
      }
    } finally {
      console.log('Logout process completed, resetting loading state');
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const checkSession = async () => {
      if (initialCheckDoneRef.current) return;

      try {
        // Check if we're returning from Spotify auth (URL will have code or error params)
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthCode = urlParams.has('code');
        const hasAuthError = urlParams.has('error');
        
        if (hasAuthCode || hasAuthError) {
          console.log("Detected return from Spotify authentication");
          // If there's an error in the URL, log it
          if (hasAuthError) {
            console.error("Auth error from Spotify:", urlParams.get('error'));
          }
        }

        console.log("Checking for existing session...");
        setLoading(true);
        const { data, error } = await getSession();

        if (error) {
          throw error;
        }

        if (isMounted.current && data?.session) {
          console.log("Session found on initial check:", data.session);
          setSession(data.session);
          onLogin?.(data.session);
        } else {
          console.log("No session found on initial check");
        }
      } catch (err) {
        console.error('Error checking session:', err);
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          initialCheckDoneRef.current = true;
        }
      }
    };

    // Always check session regardless of the current path
    checkSession();

    if (!authListenerRef.current) {
      const { data: authListener } = onAuthStateChange(
        async (event: AuthChangeEvent, newSession: Session | null) => {
          console.log(`Auth event: ${event}`);

          if (isMounted.current) {
            if (event === 'SIGNED_IN' && newSession) {
              console.log("User signed in with Spotify, session:", newSession);
              setSession(newSession);
              onLogin?.(newSession);
            } else if (event === 'SIGNED_OUT') {
              console.log("User signed out");
              setSession(null);
              onLogout?.();
            }
            setLoading(false);
          }
        }
      );

      authListenerRef.current = authListener;
    }

    return () => {
      isMounted.current = false;
      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, [onLogin, onLogout]);

  const renderUserInfo = useCallback(() => {
    if (!session) {
      return null;
    }

    const user = session.user;

    return (
      <div className="user-info">
        <h3>User Information</h3>
        <div className="user-profile">
          {user.user_metadata.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="avatar"
            />
          )}
          <div className="user-details">
            <p className="user-name">{user.user_metadata.full_name || user.user_metadata.name || 'User'}</p>
            <p className="user-email">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="logout-button"
          disabled={loading}
        >
          {loading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    );
  }, [session, loading, handleLogout]);

  return (
    <div className="spotify-auth-container">
      {error && <div className="error-message">{error}</div>}

      {!session ? (
        <div className="login-container">
          <button
            onClick={handleSpotifyLogin}
            className="spotify-button"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Login with Spotify'}
          </button>
        </div>
      ) : (
        renderUserInfo()
      )}
    </div>
  );
};

export default SpotifyAuth;