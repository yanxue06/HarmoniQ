import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotifyData from '../components/SpotifyData.tsx';
import { supabase, signOut } from '../lib/supabase'; // Import signOut function
import '../styles/mainPage.css'; // Reuse the existing CSS for styling
import '../assets/fonts.css'; // Import the font

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if the user is logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
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
      // Navigate to the login page
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="wrapper">
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
    </div>
  );
};

export default ExplorePage;