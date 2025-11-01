import React from 'react';
import { useLeads } from '../contexts/LeadsContext';
import { useAuth } from '../contexts/AuthContext'; 
import { USER_ROLES } from '../logic'; // <-- FIX: Import USER_ROLES directly
import { STAGES } from '../constants'; // <-- FIX: Import STAGES

export default function Sidebar({ 
  currentStage, 
  onSetStage,
  onGlobalDedupe, 
  onOpenBre, 
  onClearData,
  isMobileOpen,
}) {
  const { navCounts } = useLeads();
  const { visibleStages, currentUser } = useAuth(); // <-- FIX: Removed USER_ROLES from here

  const handleNavClick = (stage) => {
    onSetStage(stage);
  };
  
  // This line will now work
  const isAdmin = currentUser.role === USER_ROLES.ADMIN;

  return (
    <aside className={`sidebar ${isMobileOpen ? 'is-mobile-open' : ''}`}>
      <div className="brand">Loan CRM · LOS</div>
      <ul className="nav-list">
        {/* Only map over stages the user is allowed to see */}
        {visibleStages.map(s => (
          <li
            key={s}
            className={`nav-item ${s === currentStage ? 'active' : ''}`}
            onClick={() => handleNavClick(s)}
          >
            <span>{s}</span>
            <span className="small">{navCounts[s] || 0}</span>
          </li>
        ))}
      </ul>
      
      {/* --- NEW: Only show Admin buttons to Admin --- */}
      {isAdmin && (
        <div style={{ marginTop: '12px' }}>
          <button className="btn ghost" onClick={onGlobalDedupe} style={{ width: '100%', marginBottom: '8px' }}>Global Dedupe</button>
          <button className="btn ghost" onClick={onOpenBre} style={{ width: '100%', marginBottom: '8px' }}>BRE Config</button>
          <button className="btn ghost" onClick={onClearData} style={{ width: '100%' }}>Clear Data</button>
        </div>
      )}
      
      <div style={{ marginTop: '18px', fontSize: '12px', color: '#cbd5e1' }}>
        Fields taken from uploaded spec.
      </div>
    </aside>
  );
}