import React from 'react';

export default function Sidebar({ currentStage, onSetStage, navCounts, onGlobalDedupe, onOpenBre, onClearData, STAGES }) {
  return (
    <aside className="sidebar">
      <div className="brand">Loan CRM · LOS</div>
      <ul className="nav-list">
        {STAGES.map(s => (
          <li
            key={s}
            className={`nav-item ${s === currentStage ? 'active' : ''}`}
            onClick={() => onSetStage(s)}
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