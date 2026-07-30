import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Edit3, Loader, Trash2, AlertTriangle } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useStore } from '../store';
import { api } from '../services/api';
import BottomNav from '../components/BottomNav';
import './ProfileView.css';

export default function ProfileView() {
  const navigate = useNavigate();
  const { user, profile, setProfile, clearStore } = useStore();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
      clearStore();
      navigate('/');
    } catch (error) {
      console.error("Logout failed", error);
      clearStore();
      navigate('/');
    }
  };

  const handleDeleteProfile = async () => {
    setDeleting(true);
    try {
      await api.deleteProfile();
      if (auth.currentUser) {
        await signOut(auth);
      }
      clearStore();
      navigate('/');
    } catch (error) {
      console.error("Delete profile failed", error);
      alert("Failed to delete profile. Please try again.");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        // Compress image using Canvas
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Base64 JPEG (heavily compressed to fit in Firestore 1MB limit)
        const base64Image = canvas.toDataURL('image/jpeg', 0.6);

        try {
          // Update profile via API Gateway
          await api.updateProfile({ ...profile, image: base64Image });
          
          // Update Global State
          setProfile({ ...profile, image: base64Image });
        } catch (error) {
          console.error("Error updating profile image via API Gateway:", error);
          alert("Failed to upload image.");
        } finally {
          setUploading(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  if (!profile) return null;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2 className="heading-2">My Profile</h2>
        <button className="btn-icon">
          <Settings size={24} color="var(--text-muted)" />
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-card glass-panel animate-fade-in">
          <div className="profile-image-wrapper">
            {uploading ? (
              <div className="profile-main-image" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)'}}>
                <Loader className="spin" size={32} color="var(--primary)" />
              </div>
            ) : (
              <img 
                src={profile.image || 'https://via.placeholder.com/150'} 
                alt={profile.name} 
                className="profile-main-image" 
              />
            )}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImageUpload}
            />
            <button 
              className="edit-image-btn glass-panel" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Edit3 size={18} color="white" />
            </button>
          </div>

          <h1 className="profile-name">{profile.name}</h1>
          <p className="profile-branch text-muted">{profile.branch} • {profile.year} Year</p>
          
          <div className="profile-bio-section">
            <h3 className="section-title">About Me</h3>
            <p className="profile-bio text-muted">
              {profile.bio || "No bio added yet. Add a bio to get more matches!"}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          <button className="btn-primary logout-btn glass-panel" onClick={handleLogout}>
            <LogOut size={20} style={{marginRight: '10px'}} /> Log Out
          </button>

          <button 
            className="btn-primary glass-panel" 
            onClick={() => setShowDeleteModal(true)}
            style={{ background: 'rgba(255, 75, 75, 0.15)', border: '1px solid rgba(255, 75, 75, 0.4)', color: '#ff4b4b' }}
          >
            <Trash2 size={20} style={{marginRight: '10px'}} /> Delete Profile & Account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="match-modal animate-fade-in" style={{ zIndex: 1000 }}>
          <AlertTriangle size={48} color="#ff4b4b" style={{ marginBottom: 10 }} />
          <h2 style={{ color: '#ff4b4b', marginBottom: 6 }}>Delete Profile Permanently?</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 20, textAlign: 'center' }}>
            This action cannot be undone. All your profile info, matches, and chat history will be permanently deleted.
          </p>
          <button 
            className="btn-primary" 
            onClick={handleDeleteProfile}
            disabled={deleting}
            style={{ background: '#ff4b4b', width: '100%' }}
          >
            {deleting ? <Loader className="spin" size={20} /> : 'Yes, Delete My Account'}
          </button>
          <button 
            className="btn-primary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
            style={{ background: 'var(--surface-glass)', marginTop: 10, width: '100%' }}
          >
            Cancel
          </button>
        </div>
      )}

      <BottomNav activeTab="profile" />
    </div>
  );
}
