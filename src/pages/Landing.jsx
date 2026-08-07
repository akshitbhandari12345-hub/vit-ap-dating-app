import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Heart, Lock, User, Loader, LogIn, X } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const { user, profile, setUser, setProfile } = useStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // If already logged in, redirect them
  if (user) {
    if (profile) return <Navigate to="/app" />;
    return <Navigate to="/setup" />;
  }

  const handleDirectLoginSubmit = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setLoginError('Please enter your username/email and password.');
      return;
    }

    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await api.login(usernameOrEmail, password);
      if (res.success) {
        setUser(res.user);
        setProfile(res.profile);
        navigate('/app');
      }
    } catch (err) {
      console.error("Direct login failed:", err);
      setLoginError(err.message || 'Invalid username or password.');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="landing-container">
      <div className="glass-panel content-box animate-fade-in">
        <div className="logo-container">
          <Heart className="logo-icon" size={48} color="white" fill="white" />
          <h1 className="heading-1">VIT AP<br/>Match</h1>
        </div>
        
        <p className="subtitle text-muted">
          Campus dating app. Find your perfect match.
        </p>

        <div className="auth-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Option 1: Log In to Existing Account */}
          <button className="btn-primary login-btn" onClick={() => setShowLoginModal(true)}>
            🔑 Log In to Existing Account
          </button>

          {/* Option 2: Create Your Profile (Opens 3-Step Profile Setup Flow) */}
          <button 
            className="btn-primary login-btn" 
            style={{ background: 'var(--surface-glass)', border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={() => {
              const devUser = { uid: `user_${Date.now()}`, email: `user_${Date.now()}@gmail.com`, displayName: 'New Member' };
              useStore.getState().setUser(devUser);
              useStore.getState().setProfile(null);
              navigate('/setup');
            }}
          >
            ✨ Create Your Profile
          </button>

          <p className="privacy-note text-muted" style={{ marginTop: 10 }}>
            Sign in with your username & password. End-to-end encrypted chats & zero-trust security.
          </p>
        </div>
      </div>

      {/* Direct Username & Password Log In Modal */}
      {showLoginModal && (
        <div className="match-modal animate-fade-in" style={{ zIndex: 1000, maxWidth: 380, width: '90%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LogIn size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Log In to Account</h2>
            </div>
            <button className="btn-icon" onClick={() => setShowLoginModal(false)}>
              <X size={20} color="var(--text-muted)" />
            </button>
          </div>

          <form onSubmit={handleDirectLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <input 
                type="text" 
                placeholder="Username or Email" 
                className="input-field"
                value={usernameOrEmail}
                onChange={e => setUsernameOrEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <input 
                type="password" 
                placeholder="Password" 
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {loginError && (
              <p style={{ color: '#ff4b4b', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>
                {loginError}
              </p>
            )}

            <button className="btn-primary" type="submit" disabled={loggingIn} style={{ marginTop: 8 }}>
              {loggingIn ? <Loader className="spin" size={20} /> : 'Log In Now'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
