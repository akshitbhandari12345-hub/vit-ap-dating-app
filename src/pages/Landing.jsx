import { useNavigate, Navigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useStore } from '../store';
import { api } from '../services/api';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const { user, profile } = useStore();

  // If already logged in, redirect them
  if (user) {
    if (profile) return <Navigate to="/app" />;
    return <Navigate to="/setup" />;
  }

  const handleLogin = async () => {
    try {
      // Force the Google popup to ask the user to select an account,
      // preventing the infinite loop if they accidentally used a personal email.
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email;
      
      // Enforce VIT AP email constraint (Disabled for testing so you can use your gmail!)
      // if (!userEmail.endsWith('@vitap.ac.in')) {
      //   alert('Access Denied: You must use your @vitap.ac.in college email to join this exclusive network.');
      //   await auth.signOut();
      //   return;
      // }
      
      // The onAuthStateChanged listener in App.jsx will handle navigation
    } catch (error) {
      console.error("Login failed:", error);
      alert(error.message);
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
          Exclusive dating for VIT AP University students. Find your perfect match on campus.
        </p>

        <div className="auth-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Option 1: Log In to Existing Account */}
          <button className="btn-primary login-btn" onClick={handleLogin}>
            🔑 Log In to Existing Account
          </button>

          {/* Option 2: Create Your Profile (Opens Profile Setup Flow) */}
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
            Sign in with any normal email account. End-to-end encrypted chats & zero-trust security.
          </p>
        </div>
      </div>
    </div>
  );
}
