import React from 'react';

// Basic inline styles for the toast
const toastStyles = {
  padding: '12px 18px',
  margin: '10px 0',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '320px',
  color: '#fff',
};

const typeStyles = {
  success: { background: '#10b981' }, // --ok
  error: { background: '#ef4444' }, // --danger
  warning: { background: '#f59e0b' }, // --accent
};

export default function Toast({ message, type, onDismiss }) {
  return (
    <div style={{ ...toastStyles, ...typeStyles[type] }}>
      <span>{message}</span>
      <button 
        onClick={onDismiss} 
        style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', marginLeft: '10px' }}
      >
        &times;
      </button>
    </div>
  );
}