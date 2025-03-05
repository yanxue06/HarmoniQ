import { useState } from 'react';
import SpotifyAuth from './components/SpotifyAuth';
import { Session } from '@supabase/supabase-js';
import './App.css';

function App() {
  const [session, setSession] = useState<Session | null>(null);

  const handleLogin = (session: Session) => {
    console.log('User logged in:', session);
    setSession(session);
  };

  const handleLogout = () => {
    console.log('User logged out');
    setSession(null);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>HarmoniQ</h1>
        <p className="app-description">
          Connecting people through Music
        </p>
      </header>

      <main className="app-main">
        <SpotifyAuth 
          onLogin={handleLogin} 
          onLogout={handleLogout} 
        />

        {session && (
          <div className="welcome-message">
            <h2>Welcome, {session.user.user_metadata.name || 'Music Lover'}!</h2>
            <p>You're now connected to Spotify.</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} HarmoniQ. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
