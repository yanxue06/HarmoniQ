import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotifyData from '../components/SpotifyData.tsx';
import Messaging from '../components/Messaging.tsx';
import ConnectionsManager from '../components/ConnectionsManager.tsx';
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

  if (!isLoggedIn) {
    return (
      <div className="page-container">
        <h1 className="title">HarmoniQ</h1>
        <p className="slogan">Please log in to continue</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="title">HarmoniQ</h1>
      <p className="slogan">Explore Your Music Journey</p>

      <div className="welcome-container">
        <div className="spotify-data-container">
          <SpotifyData isLoggedIn={isLoggedIn} />
        </div>

        <div className="connections-section">
          <ConnectionsManager session={session} />
        </div>

        <div className="messaging-section">
          <Messaging session={session} />
        </div>

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
  );
};

export default ExplorePage;