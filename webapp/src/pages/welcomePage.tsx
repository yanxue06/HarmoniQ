import React from 'react';
import '../styles/welcomePage.css'; 

const WelcomePage: React.FC = () => {
  return (
    <div className="welcome-container">
      <h1 className="title">Welcome to Harmoniq!</h1>
      <p className="slogan">Discover the rhythm of your soul.</p>
      <div className="welcome-message">
        <p>
          Hey there, music lover! You’re now part of the Harmoniq community. 
          Explore new beats, create playlists, and vibe with artists from around the world.
        </p>
      </div>
      <a href="/explore" className="menu-item">Start Exploring</a>
    </div>
  );
};

export default WelcomePage;