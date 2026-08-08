import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Edit3, Loader, Trash2, AlertTriangle, Download } from 'lucide-react';
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

  if (!profile) {
    return (
      <div className="profile-container flex-center">
        <p className="text-muted">No profile found. Please complete setup.</p>
        <button className="btn-primary" style={{ marginTop: 15 }} onClick={() => navigate('/setup')}>
          Setup Profile
        </button>
      </div>
    );
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image file size exceeds the 10 MB limit. Please select a smaller photo.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        if (img.width < 640 || img.height < 640) {
          alert("Image resolution is too low. Minimum resolution is 640 × 640 pixels.");
          setUploading(false);
          return;
        }

        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1080;
        const MAX_HEIGHT = 1350;
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

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const base64Image = canvas.toDataURL('image/jpeg', 0.85);
        try {
          const updated = { ...profile, image: base64Image };
          await api.updateProfile(updated);
          setProfile(updated);
        } catch (err) {
          console.error("Failed to update photo via API gateway:", err);
          alert("Failed to update photo.");
        } finally {
          setUploading(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      clearStore();
      navigate('/');
    } catch (e) {
      console.error("Logout failed:", e);
      clearStore();
      navigate('/');
    }
  };

  const handleDeleteProfile = async () => {
    setDeleting(true);
    try {
      await api.deleteProfile();
      if (auth) {
        await signOut(auth);
      }
      clearStore();
      navigate('/');
    } catch (e) {
      console.error("Failed to delete profile:", e);
      alert("Failed to delete profile. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleGdprDataExport = async () => {
    try {
      const data = await api.exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr_data_export_${profile?.uid || 'user'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to download GDPR data export: " + e.message);
    }
  };

  return (
    <div className="profile-container animate-fade-in">
      <div className="profile-card glass-panel" style={{ userSelect: 'none' }} onContextMenu={e => e.preventDefault()}>
        <div className="profile-image-container">
          <img src={profile.image} alt={profile.name} className="profile-hero-image" draggable="false" />
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleImageUpload} 
          />
          <button 
            className="edit-photo-btn glass-panel" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader className="spin" size={18} /> : <Edit3 size={18} />}
          </button>
        </div>

        <div className="profile-details">
          <h2 className="heading-2">{profile.name}</h2>
          <p className="text-muted">{profile.branch} • Year {profile.year}</p>
          
          <div className="bio-section">
            <h3 className="section-title">About Me</h3>
            <p className="bio-text">{profile.bio || 'No bio added yet.'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          <button className="btn-primary glass-panel" onClick={handleGdprDataExport} style={{ background: 'var(--surface-glass)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Download size={20} style={{marginRight: '10px'}} /> Download My Data (GDPR Export)
          </button>
          
          <button className="btn-primary logout-btn glass-panel" onClick={handleLogout}>
            <LogOut size={20} style={{marginRight: '10px'}} /> Log Out
          </button>

          <button 
            className="btn-primary glass-panel" 
            onClick={() => setShowDeleteModal(true)}
            style={{ background: 'rgba(255, 75, 75, 0.15)', border: '1px solid rgba(255, 75, 75, 0.4)', color: '#ff4b4b' }}
          >
            <Trash2 size={20} style={{marginRight: '10px'}} /> One-Click Delete Profile (GDPR Art. 17)
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
