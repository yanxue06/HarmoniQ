// MainPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/mainPage.css";
import "../assets/fonts.css";
import "../assets/inputs.css";
import { ScrollingBackground } from "../components/background.tsx";
import SpotifyAuth from "../components/SpotifyAuth.tsx";
import { Session } from "@supabase/supabase-js";

const MainPage: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  // This callback handles Spotify login and redirects to the welcome page
  const handleLogin = (session: Session) => {
    console.log("User logged in:", session);
    setSession(session);
    navigate("/welcome"); // Redirect to the welcome page route after successful login
  };

  // Handle logout and redirect back to the main page
  const handleLogout = () => {
    console.log("User logged out");
    setSession(null);
    navigate("/");
  };

  return (
    <div id="wrapper">
      {/* Left side: scrolling background */}
      <div className="left-section">
        <ScrollingBackground />
      </div>

      {/* Right side: Title, Slogan, Login form, etc. */}
      <div className="right-section">
        <h1 className="title">HarmoniQ</h1>
        <p className="slogan">A slogan or tagline here</p>

        <div className="login-form">
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button className="menu-item" onClick={() => navigate("/welcome")}>
            Log In
          </button>
        </div>

        {/* SpotifyAuth handles Spotify-based login and uses the same login/logout callbacks */}
        <SpotifyAuth onLogin={handleLogin} onLogout={handleLogout} />
      </div>
    </div>
  );
};

export default MainPage;