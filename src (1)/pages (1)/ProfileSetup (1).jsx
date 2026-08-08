import { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Camera, ChevronRight, Loader, CheckCircle2, XCircle, ShieldCheck, Lock, User, Mail } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import './ProfileSetup.css';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useStore();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // { available: true/false, message: '' }
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    googleEmail: user?.email || '',
    emailPassword: '',
    username: '',
    accountPassword: '',
    name: user?.displayName?.split(' ')[0] || '',
    branch: '',
    year: '',
    bio: '',
    consentGiven: false,
    image: user?.photoURL || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80'
  });

  // If the user already has a profile loaded, redirect them
  if (profile) {
    return <Navigate to="/app" />;
  }

  const handleUsernameCheck = async (val) => {
    const cleaned = val.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setFormData(prev => ({ ...prev, username: cleaned }));
    
    if (cleaned.length < 3) {
      setUsernameStatus({ available: false, message: 'Username must be at least 3 characters long.' });
      return;
    }

    setCheckingUsername(true);
    try {
      const res = await api.checkUsername(cleaned);
      setUsernameStatus(res);
    } catch (e) {
      setUsernameStatus({ available: false, message: 'Failed to verify username.' });
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image file size exceeds the 10 MB limit. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 640 || img.height < 640) {
          alert("Image resolution is too low. Minimum resolution is 640 × 640 pixels.");
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
        setFormData(prev => ({ ...prev, image: base64Image }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.googleEmail.trim()) {
        setError('Please enter your Google linked email address.');
        return;
      }
      if (!formData.emailPassword) {
        setError('Please enter the password linked with your email.');
        return;
      }
      if (!formData.username.trim()) {
        setError('Please enter a unique username.');
        return;
      }
      if (usernameStatus && !usernameStatus.available) {
        setError(usernameStatus.message || 'Username is already taken.');
        return;
      }
      if (!formData.accountPassword || formData.accountPassword.length < 6) {
        setError('Please create a profile password (min 6 characters).');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      if (!formData.name.trim()) {
        setError('Please enter your first name.');
        return;
      }
      setError('');
      setStep(3);
    } else {
      if (!formData.branch || !formData.year) {
        setError('Please select your branch and year.');
        return;
      }
      if (!formData.consentGiven) {
        setError('Please check the explicit consent box for data processing to create your profile.');
        return;
      }
      setError('');
      setSaving(true);
      
      try {
        const uid = user?.uid || `student_${Date.now()}`;

        const userProfile = {
          ...formData,
          uid,
          email: formData.googleEmail,
          createdAt: new Date().toISOString()
        };

        // Ensure user is set in global store
        if (!user) {
          useStore.getState().setUser({ uid, email: formData.googleEmail, displayName: formData.name });
        }
        
        await api.updateProfile(userProfile);
        setProfile(userProfile); // Update global state
        navigate('/app');
      } catch (err) {
        console.error("Error saving profile via API Gateway:", err);
        setError("Failed to save profile. Please try again.");
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="setup-container animate-fade-in" style={{ maxWidth: 420 }}>
      <div className="header">
        <h2 className="heading-2">Create Your Profile</h2>
        <p className="text-muted">Step {step} of 3</p>
      </div>

      {step === 1 ? (
        <div className="form-group animate-fade-in" style={{ gap: 12 }}>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
            Enter your Google email credentials & create a unique handle:
          </p>

          <div style={{ position: 'relative' }}>
            <input 
              type="email" 
              placeholder="Google Linked Email (e.g. name@gmail.com)" 
              className="input-field"
              value={formData.googleEmail}
              onChange={e => setFormData({...formData, googleEmail: e.target.value})}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <input 
              type="password" 
              placeholder="Password linked with Google Email" 
              className="input-field"
              value={formData.emailPassword}
              onChange={e => setFormData({...formData, emailPassword: e.target.value})}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Unique Username (e.g. @ananya_s)" 
              className="input-field"
              value={formData.username}
              onChange={e => handleUsernameCheck(e.target.value)}
            />
            {checkingUsername && (
              <span style={{ position: 'absolute', right: 12, top: 14 }}>
                <Loader className="spin" size={18} color="var(--primary)" />
              </span>
            )}
            {usernameStatus && !checkingUsername && (
              <p style={{ 
                fontSize: '0.8rem', 
                marginTop: 4, 
                color: usernameStatus.available ? '#4caf50' : '#ff4b4b',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                {usernameStatus.available ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {usernameStatus.message}
              </p>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <input 
              type="password" 
              placeholder="Create Profile Security Password" 
              className="input-field"
              value={formData.accountPassword}
              onChange={e => setFormData({...formData, accountPassword: e.target.value})}
            />
          </div>
        </div>
      ) : step === 2 ? (
        <div className="form-group animate-fade-in">
          <div className="photo-upload" style={{ marginBottom: 20 }}>
            <img src={formData.image} alt="Profile" className="photo-placeholder" style={{ borderRadius: '16px', objectFit: 'cover' }} />
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImageUpload} 
            />
            <button 
              className="btn-primary" 
              style={{ marginTop: 10, background: 'var(--surface-glass)', fontSize: '0.85rem' }}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Profile Photo (Max 10MB)
            </button>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
              Optimal resolution: 1080×1350 (4:5 portrait) or 1080×1080 (1:1)
            </p>
          </div>
          
          <input 
            type="text" 
            placeholder="First Name" 
            className="input-field"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
        </div>
      ) : (
        <div className="form-group animate-fade-in">
          <select 
            className="input-field select-field"
            value={formData.branch}
            onChange={e => setFormData({...formData, branch: e.target.value})}
          >
            <option value="" disabled>Select Branch</option>
            <option value="CSE">Computer Science (CSE)</option>
            <option value="ECE">Electronics (ECE)</option>
            <option value="MECH">Mechanical (MECH)</option>
            <option value="BBA">BBA</option>
          </select>

          <select 
            className="input-field select-field"
            value={formData.year}
            onChange={e => setFormData({...formData, year: e.target.value})}
          >
            <option value="" disabled>Year of Study</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <textarea 
            placeholder="A short bio..." 
            className="input-field textarea-field"
            value={formData.bio}
            onChange={e => setFormData({...formData, bio: e.target.value})}
          />

          {/* GDPR Article 6 & 7 Explicit Consent Notice */}
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <input 
                type="checkbox" 
                checked={formData.consentGiven || false}
                onChange={e => setFormData({...formData, consentGiven: e.target.checked})}
                style={{ marginTop: 2 }}
              />
              <span>
                I give explicit consent for data processing (matchmaking, ~1.1km location fuzzing, and end-to-end encrypted messaging) under GDPR rules.
              </span>
            </label>
          </div>
        </div>
      )}

      {error && <p className="error-text" style={{color: '#ff4b4b', textAlign: 'center', marginBottom: '10px'}}>{error}</p>}
      
      <button className="btn-primary next-btn" onClick={handleNext} disabled={saving}>
        {saving ? <Loader className="spin" size={20} /> : (step < 3 ? 'Next Step' : 'Create Profile & Start Swiping')} 
        {!saving && <ChevronRight size={20} />}
      </button>
    </div>
  );
}
