import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Heart, Star, Loader, SlidersHorizontal, Filter } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../store';
import { api } from '../services/api';
import SwipeCard from '../components/SwipeCard';
import BottomNav from '../components/BottomNav';
import './SwipeDeck.css';

export default function SwipeDeck() {
  const navigate = useNavigate();
  const { user, profile } = useStore();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

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

  const filteredProfiles = profiles.filter(p => {
    if (selectedBranch !== 'ALL' && p.branch && p.branch.toUpperCase() !== selectedBranch) return false;
    if (selectedYear !== 'ALL' && p.year && String(p.year) !== selectedYear) return false;
    return true;
  });

  const handleSwipe = async (direction, targetUser) => {
    if (!targetUser) return;
    
    setProfiles(prev => prev.filter(p => p.id !== targetUser.id));
    
    try {
      // Process swipe via Zero-Trust API Gateway (Match logic runs on Backend)
      const res = await api.swipe(targetUser.id, direction);
      
      if (res.isMatch) {
        setMatchModal({ ...targetUser, matchId: res.matchId });
        
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

  const handleGoToChat = () => {
    if (matchModal?.matchId) {
      navigate(`/chat/${matchModal.matchId}`);
    } else {
      navigate('/matches');
    }
    setMatchModal(null);
  };

  return (
    <div className="deck-container">
      <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="heading-2" style={{color: 'hsl(var(--primary))'}}>VIT AP Match</h2>
        <button 
          className="btn-icon glass-panel" 
          onClick={() => setShowFilterModal(true)}
          style={{ padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.85rem' }}
        >
          <SlidersHorizontal size={18} color="white" />
          <span>Filter</span>
        </button>
      </div>

      <div className="card-stack-container">
        {loading ? (
          <div className="empty-state">
            <Loader className="spin" size={40} color="var(--primary)" />
            <p className="text-muted">Finding peers...</p>
          </div>
        ) : filteredProfiles.length > 0 ? (
          <div className="card-stack">
            {[...filteredProfiles].reverse().map((p, index) => (
              <SwipeCard 
                key={p.id} 
                profile={p} 
                onSwipe={(direction) => handleSwipe(direction, p)}
                isTop={index === filteredProfiles.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state glass-panel">
            <div className="pulse-circle"></div>
            <h3>No profiles match your filter</h3>
            <p className="text-muted">Try clearing your filters or check back later!</p>
            {(selectedBranch !== 'ALL' || selectedYear !== 'ALL') && (
              <button 
                className="btn-primary" 
                style={{ marginTop: 12, padding: '8px 16px', fontSize: '0.85rem' }}
                onClick={() => { setSelectedBranch('ALL'); setSelectedYear('ALL'); }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="action-buttons">
        <button 
          className="btn-icon action-btn pass glass-panel" 
          onClick={() => filteredProfiles.length > 0 && handleSwipe('left', filteredProfiles[0])}
        >
          <X size={28} color="#ff4b4b" />
        </button>
        <button 
          className="btn-icon action-btn super glass-panel"
          onClick={() => filteredProfiles.length > 0 && handleSwipe('right', filteredProfiles[0])}
        >
          <Star size={24} color="#2196f3" fill="#2196f3" />
        </button>
        <button 
          className="btn-icon action-btn like glass-panel" 
          onClick={() => filteredProfiles.length > 0 && handleSwipe('right', filteredProfiles[0])}
        >
          <Heart size={28} color="#4caf50" fill="#4caf50" />
        </button>
      </div>

      {showFilterModal && (
        <div className="match-modal animate-fade-in" style={{ zIndex: 1000, maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Filter size={24} color="var(--primary)" />
            <h2>Campus Match Filters</h2>
          </div>

          <div style={{ textAlign: 'left', width: '100%', marginBottom: 14 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Branch</label>
            <select 
              className="input-field select-field" 
              value={selectedBranch} 
              onChange={e => setSelectedBranch(e.target.value)}
            >
              <option value="ALL">All Branches</option>
              <option value="CSE">CSE (Computer Science)</option>
              <option value="ECE">ECE (Electronics)</option>
              <option value="MECH">MECH (Mechanical)</option>
              <option value="BBA">BBA</option>
            </select>
          </div>

          <div style={{ textAlign: 'left', width: '100%', marginBottom: 20 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Year of Study</label>
            <select 
              className="input-field select-field" 
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="ALL">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <button className="btn-primary" onClick={() => setShowFilterModal(false)}>
            Apply Filters
          </button>
        </div>
      )}

      {matchModal && (
        <div className="match-modal animate-fade-in">
          <h1 className="match-title">It's a Match!</h1>
          <p className="text-muted">You and {matchModal.name} liked each other.</p>
          <div className="match-images">
            <img src={profile?.image || 'https://via.placeholder.com/120'} alt="You" className="match-img" />
            <img src={matchModal.image || 'https://via.placeholder.com/120'} alt={matchModal.name} className="match-img" />
          </div>
          <button className="btn-primary" onClick={handleGoToChat}>Send E2EE Message</button>
          <button className="btn-primary" style={{background: 'var(--surface-glass)', marginTop: 10}} onClick={() => setMatchModal(null)}>Keep Swiping</button>
        </div>
      )}

      <BottomNav activeTab="swipe" />
    </div>
  );
}
