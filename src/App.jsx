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
    // Explicit login mode: Always presents Landing page initially for explicit user action
    setLoading(false);
  }, [setLoading]);

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
