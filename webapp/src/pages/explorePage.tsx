import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotifyData from '../components/SpotifyData.tsx';
import Messaging from '../components/Messaging.tsx';
import { supabase, signOut } from '../lib/supabase'; // Import signOut function
import { Session } from '@supabase/supabase-js'; // Import Session type
import '../styles/mainPage.css'; // Reuse the existing CSS for styling
import '../assets/fonts.css'; // Import the font
import '../styles/explorePage.css';

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  // Check if the user is logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setSession(session);
      if (!session) {
        navigate('/'); // Redirect to login if not authenticated
      }
    };
    checkSession();
  }, [navigate]);

  // Handle logout and navigation
  const handleBackToLogin = async () => {
    try {
      setIsLoading(true);
      // Sign out the user
      await signOut();
      setIsLoggedIn(false);
      setSession(null);
      // Navigate to the login page
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className = "page-container" id="wrapper">
      {/* Full-width section for Spotify Data */}
      <div className="right-section" style={{ width: '100%' }}>
        <h1 className="title">HarmoniQ</h1>
        <p className="slogan">Explore Your Music Journey</p>

        <div className="welcome-container">
          {isLoggedIn ? (
            <SpotifyData isLoggedIn={isLoggedIn} />
          ) : (
            <p>Please log in to view your Spotify data.</p>
          )}
          <div className="login-form">
            <button
              className="menu-item"
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              {isLoading ? 'Logging out...' : 'Back to Login'}
            </button>
          </div>
        </div>
      </div>
      <Messaging session={session} />
    </div>
  );
};

export default ExplorePage;