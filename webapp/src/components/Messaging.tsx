import { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { 
  Connection as MessagingConnection, 
  Message, 
  getUserConnections, 
  getMessages, 
  markMessagesAsRead, 
  sendMessage, 
  subscribeToMessages, 
  formatMessageTime 
} from '../lib/messaging';
import './Messaging.css';

interface MessagingProps {
  session: Session | null;
}

// Local connection type that matches what we're using in the component
interface Connection {
  id: string;
  other_user: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  };
  status: string;
}

const Messaging = ({ session }: MessagingProps) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user's connections
  useEffect(() => {
    if (!session) return;

    const fetchConnections = async () => {
      try {
        setLoading(true);
        const connectionsData = await getUserConnections(session.user.id);
        
        // Convert from MessagingConnection to our local Connection type
        const formattedConnections: Connection[] = connectionsData.map(conn => ({
          id: conn.id,
          status: conn.status,
          other_user: conn.other_user || {
            user_id: '',
            display_name: 'Unknown',
            avatar_url: null
          }
        }));
        
        setConnections(formattedConnections);
        
        // Select first connection by default if none selected
        if (formattedConnections.length > 0 && !selectedConnection) {
          setSelectedConnection(formattedConnections[0]);
        }
      } catch (err) {
        console.error('Error fetching connections:', err);
        setError('Failed to load your connections');
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [session, selectedConnection]);

  // Fetch messages when a connection is selected
  useEffect(() => {
    if (!session || !selectedConnection || !selectedConnection.other_user) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!selectedConnection.other_user.user_id) {
          throw new Error('Selected connection has no user ID');
        }

        const messages = await getMessages(
          session.user.id,
          selectedConnection.other_user.user_id
        );
        setMessages(messages);

        // Mark messages as read
        const unreadMessages = messages.filter(
          msg => msg.receiver_uid === session.user.id && !msg.read
        );

        if (unreadMessages.length > 0) {
          await markMessagesAsRead(unreadMessages.map(msg => msg.id as string));
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription for new messages
    const subscription = subscribeToMessages(session.user.id, (newMsg) => {
      // Only add the message if it's relevant to the current conversation
      if (
        selectedConnection.other_user && (
          newMsg.sender_uid === selectedConnection.other_user.user_id || 
          newMsg.receiver_uid === selectedConnection.other_user.user_id
        )
      ) {
        setMessages(prev => [...prev, newMsg]);
        
        // Mark as read immediately if we're in this conversation
        if (newMsg.receiver_uid === session.user.id) {
          markMessagesAsRead([newMsg.id as string]);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [session, selectedConnection]);
 
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session || !selectedConnection || !selectedConnection.other_user || !newMessage.trim()) return;
    
    try {
      await sendMessage({
        sender_uid: session.user.id,
        receiver_uid: selectedConnection.other_user.user_id,
        content: newMessage,
        created_at: new Date().toISOString()
      });
      
      // Clear input after sending
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  if (!session) {
    return <div className="messaging-container">Please log in to use messaging</div>;
  }

  return (
    <div className="messaging-container">
      <h2>Messages</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="messaging-layout">
        <div className="connections-list">
          <h3>Connections</h3>
          {connections.length === 0 ? (
            <p className="no-connections">No connections yet</p>
          ) : (
            <ul>
              {connections.map(connection => (
                <li 
                  key={connection.id}
                  className={`connection-item ${selectedConnection?.id === connection.id ? 'active' : ''}`}
                  onClick={() => setSelectedConnection(connection)}
                >
                  <div className="connection-avatar">
                    {connection.other_user.avatar_url ? (
                      <img src={connection.other_user.avatar_url} alt="Profile" />
                    ) : (
                      <div className="avatar-placeholder">{connection.other_user.display_name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="connection-info">
                    <p className="connection-name">{connection.other_user.display_name}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="messages-area">
          {selectedConnection && selectedConnection.other_user ? (
            <>
              <div className="messages-header">
                <h3>{selectedConnection.other_user.display_name}</h3>
              </div>
              
              <div className="messages-list">
                {messages.length === 0 ? (
                  <p className="no-messages">No messages yet. Say hello!</p>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id}
                      className={`message ${message.sender_uid === session.user.id ? 'sent' : 'received'}`}
                    >
                      <div className="message-content">
                        <p>{message.content}</p>
                        <span className="message-time">{formatMessageTime(message.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <form className="message-input" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={loading}
                />
                <button type="submit" disabled={loading || !newMessage.trim()}>
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="no-connection-selected">
              <p>Select a connection to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messaging; 