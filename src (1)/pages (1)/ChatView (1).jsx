import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../services/api';
import { encryptE2EE, decryptE2EE } from '../services/crypto';
import { ChevronLeft, Send, Sparkles, ShieldCheck } from 'lucide-react';
import './ChatView.css';

export default function ChatView() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [matchProfile, setMatchProfile] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper to decrypt all raw message payloads with E2EE
  const processMessages = async (rawMsgs) => {
    return await Promise.all(
      rawMsgs.map(async (msg) => {
        const decryptedText = await decryptE2EE(msg.text, matchId);
        return {
          ...msg,
          text: decryptedText,
        };
      })
    );
  };

  useEffect(() => {
    if (!user || !matchId) return;

    // 1. Fetch match and profile info via API Gateway
    const loadChatData = async () => {
      try {
        const matchesList = await api.getMatches();
        const currentMatch = matchesList.find(m => m.matchId === matchId);
        if (currentMatch) {
          setMatchProfile(currentMatch.profile);
        }

        // Fetch messages via API Gateway proxy & Decrypt E2EE
        const rawChatMsgs = await api.getMessages(matchId);
        const processed = await processMessages(rawChatMsgs);
        setMessages(processed);
      } catch (error) {
        console.error("Error loading chat data via API Gateway:", error);
      }
    };

    loadChatData();

    // Poll messages every 3s via backend proxy
    const interval = setInterval(async () => {
      try {
        const rawChatMsgs = await api.getMessages(matchId);
        const processed = await processMessages(rawChatMsgs);
        setMessages(processed);
      } catch (e) {
        // Silent poll error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [matchId, user]);

  const fetchAiIcebreaker = async () => {
    if (!matchProfile) return;
    setLoadingAi(true);
    try {
      const res = await api.getAICompatibility(matchProfile.uid || matchProfile.id);
      setAiSuggestion(res);
      if (res.icebreaker) {
        setNewMessage(res.icebreaker);
      }
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    try {
      // 1. Encrypt Client-Side via Web Crypto E2EE (AES-GCM-256)
      const e2eePayload = await encryptE2EE(messageText, matchId);

      // 2. Send E2EE payload through API Gateway (Server then Encrypts at Rest with Vault Key)
      const res = await api.sendMessage(matchId, e2eePayload);
      if (res.success && res.message) {
        // Render plaintext locally
        const displayMessage = {
          ...res.message,
          text: messageText,
        };
        setMessages(prev => [...prev, displayMessage]);
      }
    } catch (error) {
      console.error("Error sending message via API Gateway:", error);
    }
  };

  if (!matchProfile) return null;

  return (
    <div className="chat-container">
      <div className="chat-header glass-panel">
        <button className="btn-icon back-btn" onClick={() => navigate('/matches')}>
          <ChevronLeft size={28} color="white" />
        </button>
        <div className="chat-header-info">
          <img src={matchProfile.image || 'https://via.placeholder.com/40'} alt={matchProfile.name} className="chat-avatar" />
          <div>
            <h3 className="chat-name" style={{ marginBottom: 2 }}>{matchProfile.name}</h3>
            <span style={{ fontSize: '0.7rem', color: '#4caf50', display: 'flex', alignItems: 'center', gap: 3 }}>
              <ShieldCheck size={12} color="#4caf50" /> E2EE & Vault Encrypted
            </span>
          </div>
        </div>
        <button 
          className="btn-icon" 
          onClick={fetchAiIcebreaker}
          title="Generate AI Campus Icebreaker (Private Subnet)"
          style={{ position: 'relative', background: 'rgba(236, 39, 93, 0.15)' }}
        >
          <Sparkles size={22} color="#ec275d" className={loadingAi ? "spin" : ""} />
        </button>
      </div>

      {aiSuggestion && (
        <div className="glass-panel" style={{ margin: '10px 15px 0', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem', borderLeft: '3px solid #ec275d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#ec275d', marginBottom: 4 }}>
            <span>Campus AI Match Insight ({aiSuggestion.compatibilityScore}% Compatible)</span>
            <span style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => setAiSuggestion(null)}>✕</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{aiSuggestion.commonGround}</p>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat text-muted">
            <p>You matched with {matchProfile.name}!</p>
            <p style={{ fontSize: '0.8rem', color: '#4caf50', marginTop: 4 }}>
              🔒 Messages are End-to-End Encrypted (E2EE) and encrypted at rest on the server.
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === user.uid;
            
            let timeString = '';
            if (msg.timestamp) {
              const date = typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp.toDate?.() || new Date();
              timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            return (
              <div key={msg.id || Math.random()} className={`message-wrapper ${isMe ? 'wrapper-sent' : 'wrapper-received'}`}>
                <div className={`message-bubble ${isMe ? 'message-sent tail-right' : 'message-received glass-panel tail-left'}`}>
                  <p>{msg.text}</p>
                </div>
                {timeString && <span className="message-time text-muted">{timeString}</span>}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area glass-panel" onSubmit={handleSendMessage}>
        <input 
          type="text" 
          className="chat-input" 
          placeholder="Type an end-to-end encrypted message..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
          <Send size={24} color={newMessage.trim() ? "white" : "var(--text-muted)"} />
        </button>
      </form>
    </div>
  );
}
