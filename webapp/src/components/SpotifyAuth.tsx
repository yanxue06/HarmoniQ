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
  const [loading, setLoading] = useState(false); // Start with false to prevent initial loading state
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const authListenerRef = useRef<{ subscription: { unsubscribe: () => void } } | null>(null);
  const initialCheckDoneRef = useRef(false);

  // Memoize handlers to prevent recreating functions on each render
  const handleSpotifyLogin = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the current URL to use as the redirect URL
      const redirectUrl = window.location.origin;
      
      const { data, error } = await signInWithSpotify(redirectUrl);
      
      if (error) {
        throw error;
      }
      
      // The page will redirect to Spotify, so no need to handle the response here
    } catch (err) {
      console.error('Login error:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to login with Spotify');
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
      // We don't need to call onLogout() here as it will be triggered by the auth state change listener
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

  // Setup auth state listener only once
  useEffect(() => {
    // Set isMounted to true when component mounts
    isMounted.current = true;
    
    // Check for an existing session when the component mounts
    const checkSession = async () => {
      if (initialCheckDoneRef.current) return;
      
      try {
        setLoading(true);
        const { data, error } = await getSession();
        
        if (error) {
          throw error;
        }
        
        // Only update state if component is still mounted
        if (isMounted.current && data?.session) {
          setSession(data.session);
          onLogin?.(data.session);
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

    checkSession();

    // Set up auth state change listener only if not already set up
    if (!authListenerRef.current) {
      const { data: authListener } = onAuthStateChange(
        async (event: AuthChangeEvent, newSession: Session | null) => {
          console.log(`Auth event: ${event}`);
          
          // Only update state if component is still mounted
          if (isMounted.current) {
            if (event === 'SIGNED_IN' && newSession) {
              setSession(newSession);
              onLogin?.(newSession);
            } else if (event === 'SIGNED_OUT') {
              setSession(null);
              onLogout?.();
            }
            
            // Always reset loading state after auth state changes
            setLoading(false);
          }
        }
      );
      
      authListenerRef.current = authListener;
    }

    // Clean up the subscription when the component unmounts
    return () => {
      isMounted.current = false;
      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, []); // Empty dependency array to ensure this only runs once

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