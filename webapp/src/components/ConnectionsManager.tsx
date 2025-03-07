import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getAllUserConnections } from '../lib/messaging';
import './ConnectionsManager.css';
import { Button } from './ui/Button';

interface ConnectionsManagerProps {
  session: Session | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  compatibility_score?: number;
}

interface Connection {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  user_id_1: string;
  user_id_2: string;
  initiated_by: string;
  compatibility_score: number | null;
  created_at: string;
  other_user?: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

const ConnectionsManager = ({ session }: ConnectionsManagerProps) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'requests' | 'connections'>('suggestions');
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{
    sent: Connection[];
    received: Connection[];
  }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = async () => {
    if (!session) {
      console.log('No session available for fetching connections');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching connections for user:', session.user.id);
      
      // Fetch all connections including pending ones
      const { data: allConnections, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .or(`user_id_1.eq.${session.user.id},user_id_2.eq.${session.user.id}`);
      
      console.log('Fetched connections:', allConnections);
      
      if (connectionsError) throw connectionsError;
      
      // Get all user IDs we need to fetch profiles for
      const otherUserIds = allConnections.map(conn => 
        conn.user_id_1 === session.user.id ? conn.user_id_2 : conn.user_id_1
      );
      
      console.log('Fetching profiles for users:', otherUserIds);
      
      // Fetch all relevant user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', otherUserIds);
      
      console.log('Fetched profiles:', profiles);
      
      if (profilesError) throw profilesError;
      
      // Create a map of user profiles for easy lookup
      const profileMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Process connections with profile data
      const processedConnections = allConnections.map(conn => {
        const otherUserId = conn.user_id_1 === session.user.id ? conn.user_id_2 : conn.user_id_1;
        const profile = profileMap[otherUserId];
        
        return {
          ...conn,
          other_user: {
            user_id: otherUserId,
            display_name: profile?.display_name || 'Unknown User',
            avatar_url: profile?.avatar_url
          }
        };
      });
      
      // Separate connections by status
      const accepted = processedConnections.filter(conn => conn.status === 'accepted');
      const pendingSent = processedConnections.filter(
        conn => conn.status === 'pending' && conn.initiated_by === session.user.id
      );
      const pendingReceived = processedConnections.filter(
        conn => conn.status === 'pending' && conn.initiated_by !== session.user.id
      );
      
      setConnections(accepted);
      setPendingRequests({
        sent: pendingSent,
        received: pendingReceived
      });
      
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestedUsers = async () => {
    if (!session) {
      console.log('No session available for fetching suggested users');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching suggested users for:', session.user.id);
      
      // Get all existing connections using the shared function
      const existingConnections = await getAllUserConnections(session.user.id);
      console.log('Existing connections:', existingConnections);
      
      // Get all user IDs that the current user is already connected to
      const connectedUserIds = new Set<string>();
      existingConnections.forEach(conn => {
        if (conn.user_id_1 === session.user.id) {
          connectedUserIds.add(conn.user_id_2);
        } else {
          connectedUserIds.add(conn.user_id_1);
        }
      });
      
      // Add the current user's ID to exclude from suggestions
      connectedUserIds.add(session.user.id);
      
      console.log('Connected user IDs:', Array.from(connectedUserIds));
      
      let query = supabase
        .from('user_profiles')
        .select('*')
        .neq('user_id', session.user.id);  // Exclude current user
        
      // Only add the "not in" filter if there are other connected users
      if (connectedUserIds.size > 1) {  // > 1 because it includes the current user
        const connectedArray = Array.from(connectedUserIds);
        query = query.not('user_id', 'in', `(${connectedArray.join(',')})`);
      }
      
      const { data: users, error: usersError } = await query;
      
      console.log('Fetched suggested users:', users);
      
      if (usersError) throw usersError;

      // Add mock compatibility scores for now
      const usersWithScores = (users || []).map(user => ({
        ...user,
        compatibility_score: Math.floor(Math.random() * 100) // Mock score
      }));
      
      setSuggestedUsers(usersWithScores);
    } catch (err) {
      console.error('Error fetching suggested users:', err);
      setError('Failed to load suggested users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    if (!session) return;
    fetchSuggestedUsers();
    fetchConnections();
  }, [session]);

  // Refresh data when tab changes
  useEffect(() => {
    if (!session) return;
    
    if (activeTab === 'suggestions') {
      fetchSuggestedUsers();
    } else if (activeTab === 'requests' || activeTab === 'connections') {
      fetchConnections();
    }
  }, [activeTab, session]);

  const handleSendRequest = async (userId: string) => {
    if (!session) return;
    
    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          user_id_1: session.user.id,
          user_id_2: userId,
          status: 'pending',
          initiated_by: session.user.id,
          compatibility_score: null // This will be calculated server-side
        });
      
      if (error) throw error;
      
      // Refresh the suggestions and connections lists
      fetchSuggestedUsers();
      fetchConnections();
      
    } catch (err) {
      console.error('Error sending connection request:', err);
      setError('Failed to send connection request');
    }
  };

  const handleAcceptRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);
      
      if (error) throw error;
      
      // Refresh the connections list
      fetchConnections();
      
    } catch (err) {
      console.error('Error accepting connection request:', err);
      setError('Failed to accept connection request');
    }
  };

  const handleRejectRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);
      
      if (error) throw error;
      
      // Refresh the connections list
      fetchConnections();
      
    } catch (err) {
      console.error('Error rejecting connection request:', err);
      setError('Failed to reject connection request');
    }
  };

  if (!session) {
    return <div className="connections-container">Please log in to manage connections</div>;
  }

  const renderSuggestedUsers = () => (
    <div className="suggested-users">
      {loading ? (
        <p className="loading">Loading suggested users...</p>
      ) : suggestedUsers.length === 0 ? (
        <p className="no-data">No suggested users available at the moment</p>
      ) : (
        suggestedUsers.map(user => (
          <div key={user.user_id} className="user-card">
            <img 
              src={user.avatar_url || '/default-avatar.png'} 
              alt={user.display_name} 
              className="avatar"
            />
            <div className="user-info">
              <h3>{user.display_name}</h3>
              <p>Compatibility: {user.compatibility_score}%</p>
            </div>
            <Button 
              onClick={() => handleSendRequest(user.user_id)}
              variant="primary"
            >
              Connect
            </Button>
          </div>
        ))
      )}
    </div>
  );

  const renderPendingRequests = () => (
    <div className="pending-requests">
      <h3>Received Requests</h3>
      {pendingRequests.received.map(request => (
        <div key={request.id} className="request-card">
          <img 
            src={request.other_user?.avatar_url || '/default-avatar.png'} 
            alt={request.other_user?.display_name || 'Unknown User'} 
            className="avatar"
          />
          <div className="user-info">
            <h3>{request.other_user?.display_name || 'Unknown User'}</h3>
            {request.compatibility_score && (
              <p>Compatibility: {request.compatibility_score}%</p>
            )}
          </div>
          <div className="actions">
            <Button 
              onClick={() => handleAcceptRequest(request.id)}
              variant="primary"
            >
              Accept
            </Button>
            <Button 
              onClick={() => handleRejectRequest(request.id)}
              variant="secondary"
            >
              Reject
            </Button>
          </div>
        </div>
      ))}

      <h3>Sent Requests</h3>
      {pendingRequests.sent.map(request => (
        <div key={request.id} className="request-card">
          <img 
            src={request.other_user?.avatar_url || '/default-avatar.png'} 
            alt={request.other_user?.display_name || 'Unknown User'} 
            className="avatar"
          />
          <div className="user-info">
            <h3>{request.other_user?.display_name || 'Unknown User'}</h3>
            <p>Request Pending</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderConnections = () => (
    <div className="connections-list">
      <h3>Your Connections</h3>
      {loading ? (
        <p className="loading">Loading connections...</p>
      ) : connections.length === 0 ? (
        <p className="no-data">No connections yet</p>
      ) : (
        <div className="connections-grid">
          {connections.map(connection => (
            <div key={connection.id} className="connection-card">
              <img 
                src={connection.other_user?.avatar_url || '/default-avatar.png'} 
                alt={connection.other_user?.display_name || 'Unknown User'} 
                className="avatar"
              />
              <div className="user-info">
                <h3>{connection.other_user?.display_name || 'Unknown User'}</h3>
                {connection.compatibility_score && (
                  <p>Compatibility: {connection.compatibility_score}%</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="connections-container">
      <h2>Music Connections</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="connections-tabs">
        <button 
          className={activeTab === 'suggestions' ? 'active' : ''}
          onClick={() => setActiveTab('suggestions')}
        >
          Suggestions ({suggestedUsers.length})
        </button>
        <button 
          className={activeTab === 'requests' ? 'active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({pendingRequests.received.length})
        </button>
        <button 
          className={activeTab === 'connections' ? 'active' : ''}
          onClick={() => setActiveTab('connections')}
        >
          Connections ({connections.length})
        </button>
      </div>
      
      {loading && <div className="loading-indicator">Loading...</div>}
      
      <div className="connections-content">
        {activeTab === 'suggestions' && (
          <>
            <h3>Suggested Users ({suggestedUsers.length})</h3>
            {renderSuggestedUsers()}
          </>
        )}
        {activeTab === 'requests' && (
          <>
            <h3>Connection Requests</h3>
            {renderPendingRequests()}
          </>
        )}
        {activeTab === 'connections' && (
          <>
            <h3>Your Connections ({connections.length})</h3>
            {renderConnections()}
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionsManager; 