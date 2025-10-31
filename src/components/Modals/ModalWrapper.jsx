import React from 'react';

export default function ModalWrapper({ title, children, onClose }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{title}</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ marginTop: '8px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}