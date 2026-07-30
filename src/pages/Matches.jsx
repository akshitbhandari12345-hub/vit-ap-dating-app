import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../services/api';
import { Loader, Heart } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import './Matches.css';

export default function Matches() {
  const { user } = useStore();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchMatches = async () => {
      try {
        const matchesList = await api.getMatches();
        // Extract matchId and profile details for UI
        const formatted = matchesList.map(m => ({
          matchId: m.matchId,
          ...m.profile
        }));
        setMatches(formatted);
      } catch (error) {
        console.error("Error fetching matches via API Gateway:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatches();
  }, [user]);

  return (
    <div className="matches-container">
      <div className="matches-header">
        <h2 className="heading-2">Matches & Messages</h2>
      </div>

      {loading ? (
        <div style={{display: 'flex', justifyContent: 'center', marginTop: 50}}>
          <Loader className="spin" size={40} color="var(--primary)" />
        </div>
      ) : matches.length > 0 ? (
        <>
          <div className="matches-grid">
            <h3 className="section-title text-muted">New Matches</h3>
            <div className="new-matches-scroll">
              {matches.map(match => (
                <div 
                  key={match.matchId} 
                  className="match-bubble"
                  onClick={() => navigate(`/chat/${match.matchId}`)}
                  style={{cursor: 'pointer'}}
                >
                  <img src={match.image || 'https://via.placeholder.com/70'} alt={match.name} className="bubble-img" />
                  <p className="bubble-name">{match.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="messages-list">
            <h3 className="section-title text-muted">Messages</h3>
            {matches.map(match => (
              <div 
                key={match.matchId} 
                className="message-item glass-panel"
                onClick={() => navigate(`/chat/${match.matchId}`)}
              >
                <img src={match.image || 'https://via.placeholder.com/60'} alt={match.name} className="msg-avatar" />
                <div className="msg-content">
                  <h4 className="msg-name">{match.name}</h4>
                  <p className="msg-text text-muted">Tap to chat with {match.name}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state glass-panel" style={{marginTop: 50, padding: 30, textAlign: 'center'}}>
          <Heart size={48} color="var(--text-muted)" style={{marginBottom: 15}} />
          <h3>No Matches Yet</h3>
          <p className="text-muted">Keep swiping! Your perfect match from VIT AP is out there.</p>
        </div>
      )}

      <BottomNav activeTab="matches" />
    </div>
  );
}
