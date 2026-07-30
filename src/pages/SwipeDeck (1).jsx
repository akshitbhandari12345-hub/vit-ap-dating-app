import { useState, useEffect } from 'react';
import { X, Heart, Star, Loader } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../store';
import { api } from '../services/api';
import SwipeCard from '../components/SwipeCard';
import BottomNav from '../components/BottomNav';
import './SwipeDeck.css';

export default function SwipeDeck() {
  const { user } = useStore();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchProfiles = async () => {
      try {
        const potentialMatches = await api.getProfilesFeed();
        setProfiles(potentialMatches);
      } catch (error) {
        console.error("Error fetching profiles from API Gateway:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfiles();
  }, [user]);

  const handleSwipe = async (direction, targetUser) => {
    if (!targetUser) return;
    
    setProfiles(prev => prev.filter(p => p.id !== targetUser.id));
    
    try {
      // Process swipe via Zero-Trust API Gateway (Match logic runs on Backend)
      const res = await api.swipe(targetUser.id, direction);
      
      if (res.isMatch) {
        setMatchModal(targetUser);
        
        // Trigger Confetti
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ec275d', '#ff4b4b', '#4caf50', '#2196f3']
        });
      }
    } catch (error) {
      console.error("Error processing swipe via API Gateway:", error);
    }
  };

  return (
    <div className="deck-container">
      <div className="top-bar">
        <h2 className="heading-2" style={{color: 'hsl(var(--primary))'}}>VIT AP</h2>
      </div>

      <div className="card-stack-container">
        {loading ? (
          <div className="empty-state">
            <Loader className="spin" size={40} color="var(--primary)" />
            <p className="text-muted">Finding peers...</p>
          </div>
        ) : profiles.length > 0 ? (
          <div className="card-stack">
            {[...profiles].reverse().map((profile, index) => (
              <SwipeCard 
                key={profile.id} 
                profile={profile} 
                onSwipe={(direction) => handleSwipe(direction, profile)}
                isTop={index === profiles.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state glass-panel">
            <div className="pulse-circle"></div>
            <h3>No more profiles</h3>
            <p className="text-muted">Check back later for more peers!</p>
          </div>
        )}
      </div>

      <div className="action-buttons">
        <button 
          className="btn-icon action-btn pass glass-panel" 
          onClick={() => profiles.length > 0 && handleSwipe('left', profiles[0])}
        >
          <X size={28} color="#ff4b4b" />
        </button>
        <button className="btn-icon action-btn super glass-panel">
          <Star size={24} color="#2196f3" fill="#2196f3" />
        </button>
        <button 
          className="btn-icon action-btn like glass-panel" 
          onClick={() => profiles.length > 0 && handleSwipe('right', profiles[0])}
        >
          <Heart size={28} color="#4caf50" fill="#4caf50" />
        </button>
      </div>

      <BottomNav activeTab="swipe" />

      {matchModal && (
        <div className="match-modal animate-fade-in">
          <h1 className="match-title">It's a Match!</h1>
          <p className="text-muted">You and {matchModal.name} liked each other.</p>
          <div className="match-images">
            <img src={user.photoURL || 'https://via.placeholder.com/120'} alt="You" className="match-img" />
            <img src={matchModal.image || 'https://via.placeholder.com/120'} alt={matchModal.name} className="match-img" />
          </div>
          <button className="btn-primary" onClick={() => setMatchModal(null)}>Send a Message</button>
          <button className="btn-primary" style={{background: 'var(--surface-glass)', marginTop: 10}} onClick={() => setMatchModal(null)}>Keep Swiping</button>
        </div>
      )}
    </div>
  );
}
