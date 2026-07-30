import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useStore } from '../store';
import { Heart, MessageCircle, LogOut } from 'lucide-react';
import './DesktopSidebar.css';

export default function DesktopSidebar() {
  const { user, profile, clearStore } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('matches'); // matches or messages

  useEffect(() => {
    if (!user) return;
    
    const fetchMatches = async () => {
      try {
        const q = query(collection(db, 'matches'), where('users', 'array-contains', user.uid));
        const matchesSnap = await getDocs(q);
        
        const matchesData = [];
        for (const matchDoc of matchesSnap.docs) {
          const matchInfo = matchDoc.data();
          const otherUserId = matchInfo.users.find(id => id !== user.uid);
          
          if (otherUserId) {
            const profileSnap = await getDoc(doc(db, 'users', otherUserId));
            if (profileSnap.exists()) {
              matchesData.push({
                matchId: matchDoc.id,
                ...profileSnap.data()
              });
            }
          }
        }
        
        setMatches(matchesData);
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };
    
    fetchMatches();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearStore();
      navigate('/');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (!profile) return null;

  return (
    <div className="desktop-sidebar desktop-only glass-panel">
      
      {/* Profile Header */}
      <div className="sidebar-header">
        <div className="sidebar-profile-info" onClick={() => navigate('/profile')} style={{flexGrow: 1}}>
          <img src={profile.image || 'https://via.placeholder.com/40'} alt="Me" className="sidebar-avatar" />
          <h3 className="sidebar-name">{profile.name}</h3>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
          <button className="btn-icon sidebar-logout" onClick={() => navigate('/app')} title="Swipe">
            <Heart size={20} color="var(--primary)" fill="var(--primary)" />
          </button>
          <button className="btn-icon sidebar-logout" onClick={handleLogout} title="Logout">
            <LogOut size={20} color="var(--text-muted)" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button 
          className={`sidebar-tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          Matches
        </button>
        <button 
          className={`sidebar-tab ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages
        </button>
      </div>

      {/* Content List */}
      <div className="sidebar-content-list">
        {matches.length === 0 ? (
          <div className="sidebar-empty">
            <Heart size={32} color="var(--text-muted)" style={{marginBottom: 10}} />
            <p>No {activeTab} yet.</p>
          </div>
        ) : (
          <div className={activeTab === 'matches' ? 'sidebar-matches-grid' : 'sidebar-messages-list'}>
            {matches.map(match => (
              <div 
                key={match.matchId} 
                className={`sidebar-item ${location.pathname.includes(match.matchId) ? 'active-chat' : ''}`}
                onClick={() => navigate(`/chat/${match.matchId}`)}
              >
                <img src={match.image || 'https://via.placeholder.com/60'} alt={match.name} className="sidebar-item-img" />
                {activeTab === 'messages' && (
                  <div className="sidebar-item-info">
                    <h4 className="sidebar-item-name">{match.name}</h4>
                    <p className="sidebar-item-text text-muted">Tap to chat</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
