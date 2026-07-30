import { useState } from 'react';
import { MapPin, Info } from 'lucide-react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import './SwipeCard.css';

export default function SwipeCard({ profile, onSwipe, isTop }) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  
  // Transform values for card rotation
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Transform values for stamps
  const likeOpacity = useTransform(x, [10, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-10, -100], [0, 1]);

  const handleDragEnd = (event, info) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      controls.start({ x: 500, opacity: 0 }).then(() => onSwipe('right'));
    } else if (info.offset.x < -threshold) {
      controls.start({ x: -500, opacity: 0 }).then(() => onSwipe('left'));
    } else {
      controls.start({ x: 0, y: 0 });
    }
  };

  return (
    <motion.div
      className="swipe-card"
      style={{ x, rotate, opacity }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ scale: 0.95, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.3 }}
    >
      <img src={profile.image} alt={profile.name} className="card-image" draggable="false" />
      
      {/* Visual Stamps */}
      <motion.div className="swipe-stamp stamp-like" style={{ opacity: likeOpacity }}>
        LIKE
      </motion.div>
      <motion.div className="swipe-stamp stamp-nope" style={{ opacity: nopeOpacity }}>
        NOPE
      </motion.div>

      <div className="card-overlay">
        <div className="card-info">
          <div>
            <h2 className="card-name">{profile.name}</h2>
            <p className="card-branch">{profile.branch} • Year {profile.year}</p>
          </div>
          <button className="btn-icon info-btn glass-panel">
            <Info size={24} color="white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
