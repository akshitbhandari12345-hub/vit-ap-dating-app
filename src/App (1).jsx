import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { api } from './services/api';
import { useStore } from './store';
import Landing from './pages/Landing';
import ProfileSetup from './pages/ProfileSetup';
import SwipeDeck from './pages/SwipeDeck';
import Matches from './pages/Matches';
import ProfileView from './pages/ProfileView';
import ChatView from './pages/ChatView';
import DesktopSidebar from './components/DesktopSidebar';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children, requireProfile = true }) => {
  const { user, profile, loading } = useStore();
  
  if (loading) return <div className="deck-container" style={{justifyContent: 'center', alignItems: 'center'}}><div className="pulse-circle"></div></div>;
  
  if (!user) return <Navigate to="/" />;
  if (requireProfile && !profile) return <Navigate to="/setup" />;
  
  if (requireProfile) {
    return (
      <div className="app-wrapper">
        <DesktopSidebar />
        <main className="main-content-area">
          {children}
        </main>
      </div>
    );
  }
  
  return children;
};

function App() {
  const { setUser, setProfile, setLoading } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch profile via Zero-Trust API Gateway
        try {
          const profileData = await api.getMyProfile();
          setProfile(profileData);
        } catch (error) {
          console.error("Error fetching profile via API Gateway:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/setup" element={
          <ProtectedRoute requireProfile={false}>
            <ProfileSetup />
          </ProtectedRoute>
        } />
        <Route path="/app" element={
          <ProtectedRoute>
            <SwipeDeck />
          </ProtectedRoute>
        } />
        <Route path="/matches" element={
          <ProtectedRoute>
            <Matches />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfileView />
          </ProtectedRoute>
        } />
        <Route path="/chat/:matchId" element={
          <ProtectedRoute>
            <ChatView />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
