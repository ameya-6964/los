import React from 'react';
import { STAGES } from '../constants';
import { useLeads } from '../contexts/LeadsContext';

export default function Sidebar({ 
  currentStage, 
  onSetStage, // This is the new handler from App.jsx that auto-closes
  onGlobalDedupe, 
  onOpenBre, 
  onClearData,
  isMobileOpen, // new prop
  onCloseMobile // new prop
}) {
  const { navCounts } = useLeads();

  // New handler to close the menu when a link is clicked
  const handleNavClick = (stage) => {
    onSetStage(stage);
    // onCloseMobile(); // This is already handled in App.jsx's handleSetStage
  };

  return (
    // Add the 'is-mobile-open' class when active
    <aside className={`sidebar ${isMobileOpen ? 'is-mobile-open' : ''}`}>
      <div className="brand">Loan CRM · LOS</div>
      <ul className="nav-list">
        {STAGES.map(s => (
          <li
            key={s}
            className={`nav-item ${s === currentStage ? 'active' : ''}`}
            onClick={() => handleNavClick(s)} // Use new handler
          >
            <span>{s}</span>
            <span className="small">{navCounts[s] || 0}</span>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: '12px' }}>
        <button className="btn ghost" onClick={onGlobalDedupe} style={{ width: '100%', marginBottom: '8px' }}>Global Dedupe</button>
        <button className="btn ghost" onClick={onOpenBre} style={{ width: '100%', marginBottom: '8px' }}>BRE Config</button>
        <button className="btn ghost" onClick={onClearData} style={{ width: '100%' }}>Clear Data</button>
      </div>
      <div style={{ marginTop: '18px', fontSize: '12px', color: '#cbd5e1' }}>
        Fields taken from uploaded spec.
      </div>
    </aside>
  );
}