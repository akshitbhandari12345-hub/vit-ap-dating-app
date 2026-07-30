import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Camera, ChevronRight, Loader } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import './ProfileSetup.css';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useStore();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.displayName?.split(' ')[0] || '',
    branch: '',
    year: '',
    bio: '',
    image: user?.photoURL || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80'
  });

  // If the user already has a profile loaded, redirect them
  if (profile) {
    return <Navigate to="/app" />;
  }

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.name.trim()) {
        setError('Please enter your first name.');
        return;
      }
      setError('');
      setStep(2);
    } else {
      if (!formData.branch || !formData.year) {
        setError('Please select your branch and year.');
        return;
      }
      setError('');
      setSaving(true);
      
      try {
        const userProfile = {
          ...formData,
          uid: user.uid,
          email: user.email,
          createdAt: new Date().toISOString()
        };
        
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
    <div className="setup-container animate-fade-in">
      <div className="header">
        <h2 className="heading-2">Setup Profile</h2>
        <p className="text-muted">Step {step} of 2</p>
      </div>

      {step === 1 ? (
        <div className="form-group">
          <div className="photo-upload">
            <img src={formData.image} alt="Profile" className="photo-placeholder" style={{border: 'none'}} />
            <p className="text-muted">Google profile photo used</p>
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
        <div className="form-group">
          <select 
            className="input-field select-field"
            value={formData.branch}
            onChange={e => setFormData({...formData, branch: e.target.value})}
          >
            <option value="" disabled>Select Branch</option>
            <option value="CSE">Computer Science</option>
            <option value="ECE">Electronics</option>
            <option value="MECH">Mechanical</option>
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
        </div>
      )}

      {error && <p className="error-text" style={{color: '#ff4b4b', textAlign: 'center', marginBottom: '10px'}}>{error}</p>}
      
      <button className="btn-primary next-btn" onClick={handleNext} disabled={saving}>
        {saving ? <Loader className="spin" size={20} /> : (step === 1 ? 'Next' : 'Start Swiping')} 
        {!saving && <ChevronRight size={20} />}
      </button>
    </div>
  );
}
