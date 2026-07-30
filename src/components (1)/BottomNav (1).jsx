import { Flame, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './BottomNav.css';

export default function BottomNav({ activeTab }) {
  const navigate = useNavigate();

  return (
    <div className="bottom-nav glass-panel mobile-only">
      <button 
        className={`nav-btn ${activeTab === 'swipe' ? 'active' : ''}`}
        onClick={() => navigate('/app')}
      >
        <Flame size={28} />
      </button>
      <button 
        className={`nav-btn ${activeTab === 'matches' ? 'active' : ''}`}
        onClick={() => navigate('/matches')}
      >
        <MessageCircle size={28} />
      </button>
      <button 
        className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
      >
        <User size={28} />
      </button>
    </div>
  );
}
