import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import './ConnectionsManager.css';

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
}

const ConnectionsManager = ({ session }: ConnectionsManagerProps) => {
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{
    sent: Array<Connection & { other_user: UserProfile }>;
    received: Array<Connection & { other_user: UserProfile }>;
  }>({ sent: [], received: [] });
  const [connections, setConnections] = useState<Array<Connection & { other_user: UserProfile }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'requests' | 'connections'>('suggestions');

  // Fetch suggested users
  useEffect(() => {
    if (!session) return;

    const fetchSuggestedUsers = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, you would call a Supabase function that returns
        // users with similar music tastes. For now, we'll just get users who aren't connected.
        const { data: existingConnections, error: connectionsError } = await supabase
          .from('connections')
          .select('user_id_1, user_id_2')
          .or(`user_id_1.eq.${session.user.id},user_id_2.eq.${session.user.id}`);
        
        if (connectionsError) throw connectionsError;
        
        // Get all user IDs that the current user is already connected to
        const connectedUserIds = new Set<string>();
        existingConnections?.forEach(conn => {
          if (conn.user_id_1 === session.user.id) {
            connectedUserIds.add(conn.user_id_2);
          } else {
            connectedUserIds.add(conn.user_id_1);
          }
        });
        
        // Add the current user's ID to exclude from suggestions
        connectedUserIds.add(session.user.id);
        
        // Get users who aren't connected to the current user
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select('*')
          .not('user_id', 'in', `(${Array.from(connectedUserIds).join(',')})`)
          .limit(10);
        
        if (usersError) throw usersError;

        // Fix this such that the compatibility score is calculated intelligently
        const usersWithScores = users.map(user => ({
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

    fetchSuggestedUsers();
  }, [session]);

  // Fetch pending requests and connections
  useEffect(() => {
    if (!session) return;

    const fetchConnections = async () => {
      if (!session) return;

      try {
        setLoading(true);
        
        // Simplified query without foreign key references
        const { data, error } = await supabase
          .from('connections')
          .select('*')
          .or(`user_id_1.eq.${session.user.id},user_id_2.eq.${session.user.id}`)
          .eq('status', 'accepted');
        
        if (error) throw error;
        
        console.log("Raw connections data:", data);
        
        // Process connections without relying on foreign key joins
        const acceptedConnections = data?.map(conn => {
          const isUser1 = conn.user_id_1 === session.user.id;
          const otherUserId = isUser1 ? conn.user_id_2 : conn.user_id_1;
          
          return {
            ...conn,
            other_user: {
              user_id: otherUserId,
              display_name: `User ${otherUserId.substring(0, 6)}...`, // Placeholder
              avatar_url: null
            }
          };
        }) || [];
        
        setConnections(acceptedConnections);
        
        // Optionally fetch user profiles in a separate query
        if (acceptedConnections.length > 0) {
          const otherUserIds = acceptedConnections.map(conn => 
            conn.user_id_1 === session.user.id ? conn.user_id_2 : conn.user_id_1
          );
          
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', otherUserIds);
          
          if (profiles && profiles.length > 0) {
            // Update connections with actual profile data
            const updatedConnections = acceptedConnections.map(conn => {
              const profile = profiles.find(p => p.user_id === conn.other_user.user_id);
              if (profile) {
                return {
                  ...conn,
                  other_user: {
                    ...conn.other_user,
                    display_name: profile.display_name,
                    avatar_url: profile.avatar_url
                  }
                };
              }
              return conn;
            });
            
            setConnections(updatedConnections);
          }
        }
      } catch (err) {
        console.error('Error fetching connections:', err);
        setError('Failed to load connections');
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [session]);

  const handleSendRequest = async (userId: string) => {
    if (!session) return;
    
    try {
      setLoading(true);
      
      // Calculate compatibility score (mock for now)
      const compatibilityScore = Math.floor(Math.random() * 100);
      
      // Create connection
      const { error } = await supabase
        .from('connections')
        .insert({
          user_id_1: session.user.id,
          user_id_2: userId,
          status: 'pending',
          initiated_by: session.user.id,
          compatibility_score: compatibilityScore,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Remove user from suggestions
      setSuggestedUsers(prev => prev.filter(user => user.user_id !== userId));
      
      // Refresh connections
      setActiveTab('requests');
    } catch (err) {
      console.error('Error sending connection request:', err);
      setError('Failed to send connection request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (connectionId: string) => {
    if (!session) return;
    
    try {
      setLoading(true);
      
      // Update connection status
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);
      
      if (error) throw error;
      
      // Move connection from pending to accepted
      const acceptedRequest = pendingRequests.received.find(req => req.id === connectionId);
      
      if (acceptedRequest) {
        setPendingRequests(prev => ({
          ...prev,
          received: prev.received.filter(req => req.id !== connectionId)
        }));
        
        setConnections(prev => [...prev, acceptedRequest]);
      }
      
      setActiveTab('connections');
    } catch (err) {
      console.error('Error accepting connection request:', err);
      setError('Failed to accept connection request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (connectionId: string) => {
    if (!session) return;
    
    try {
      setLoading(true);
      
      // Update connection status
      const { error } = await supabase
        .from('connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);
      
      if (error) throw error;
      
      // Remove from pending requests
      setPendingRequests(prev => ({
        ...prev,
        received: prev.received.filter(req => req.id !== connectionId)
      }));
    } catch (err) {
      console.error('Error rejecting connection request:', err);
      setError('Failed to reject connection request');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div className="connections-container">Please log in to manage connections</div>;
  }

  return (
    <div className="connections-container">
      <h2>Music Connections</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="connections-tabs">
        <button 
          className={activeTab === 'suggestions' ? 'active' : ''}
          onClick={() => setActiveTab('suggestions')}
        >
          Suggestions
        </button>
        <button 
          className={activeTab === 'requests' ? 'active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Requests {pendingRequests.received.length > 0 && <span className="badge">{pendingRequests.received.length}</span>}
        </button>
        <button 
          className={activeTab === 'connections' ? 'active' : ''}
          onClick={() => setActiveTab('connections')}
        >
          Connections
        </button>
      </div>
      
      <div className="connections-content">
        {activeTab === 'suggestions' && (
          <div className="suggestions-list">
            <h3>People You Might Like</h3>
            {loading ? (
              <p className="loading">Loading suggestions...</p>
            ) : suggestedUsers.length === 0 ? (
              <p className="no-data">No suggestions available at the moment</p>
            ) : (
              <ul>
                {suggestedUsers.map(user => (
                  <li key={user.user_id} className="user-card">
                    <div className="user-avatar">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" />
                      ) : (
                        <div className="avatar-placeholder">{user.display_name.charAt(0)}</div>
                      )}
                    </div>
                    <div className="user-info">
                      <h4>{user.display_name}</h4>
                      <div className="compatibility">
                        <div className="compatibility-bar">
                          <div 
                            className="compatibility-fill" 
                            style={{ width: `${user.compatibility_score}%` }}
                          ></div>
                        </div>
                        <span>{user.compatibility_score}% Match</span>
                      </div>
                    </div>
                    <button 
                      className="connect-button"
                      onClick={() => handleSendRequest(user.user_id)}
                      disabled={loading}
                    >
                      Connect
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {activeTab === 'requests' && (
          <div className="requests-list">
            <div className="requests-section">
              <h3>Received Requests</h3>
              {loading ? (
                <p className="loading">Loading requests...</p>
              ) : pendingRequests.received.length === 0 ? (
                <p className="no-data">No pending requests</p>
              ) : (
                <ul>
                  {pendingRequests.received.map(request => (
                    <li key={request.id} className="request-card">
                      <div className="user-avatar">
                        {request.other_user.avatar_url ? (
                          <img src={request.other_user.avatar_url} alt="Profile" />
                        ) : (
                          <div className="avatar-placeholder">{request.other_user.display_name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="user-info">
                        <h4>{request.other_user.display_name}</h4>
                        <div className="compatibility">
                          <div className="compatibility-bar">
                            <div 
                              className="compatibility-fill" 
                              style={{ width: `${request.compatibility_score || 0}%` }}
                            ></div>
                          </div>
                          <span>{request.compatibility_score || 0}% Match</span>
                        </div>
                      </div>
                      <div className="request-actions">
                        <button 
                          className="accept-button"
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={loading}
                        >
                          Accept
                        </button>
                        <button 
                          className="reject-button"
                          onClick={() => handleRejectRequest(request.id)}
                          disabled={loading}
                        >
                          Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="requests-section">
              <h3>Sent Requests</h3>
              {loading ? (
                <p className="loading">Loading requests...</p>
              ) : pendingRequests.sent.length === 0 ? (
                <p className="no-data">No sent requests</p>
              ) : (
                <ul>
                  {pendingRequests.sent.map(request => (
                    <li key={request.id} className="request-card sent">
                      <div className="user-avatar">
                        {request.other_user.avatar_url ? (
                          <img src={request.other_user.avatar_url} alt="Profile" />
                        ) : (
                          <div className="avatar-placeholder">{request.other_user.display_name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="user-info">
                        <h4>{request.other_user.display_name}</h4>
                        <p className="pending-status">Pending</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'connections' && (
          <div className="connections-list">
            <h3>Your Connections</h3>
            {loading ? (
              <p className="loading">Loading connections...</p>
            ) : connections.length === 0 ? (
              <p className="no-data">No connections yet</p>
            ) : (
              <ul>
                {connections.map(connection => (
                  <li key={connection.id} className="connection-card">
                    <div className="user-avatar">
                      {connection.other_user.avatar_url ? (
                        <img src={connection.other_user.avatar_url} alt="Profile" />
                      ) : (
                        <div className="avatar-placeholder">{connection.other_user.display_name.charAt(0)}</div>
                      )}
                    </div>
                    <div className="user-info">
                      <h4>{connection.other_user.display_name}</h4>
                      <div className="compatibility">
                        <div className="compatibility-bar">
                          <div 
                            className="compatibility-fill" 
                            style={{ width: `${connection.compatibility_score || 0}%` }}
                          ></div>
                        </div>
                        <span>{connection.compatibility_score || 0}% Match</span>
                      </div>
                    </div>
                    <button className="message-button">Message</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionsManager; 