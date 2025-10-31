import React from 'react';
import { useLeads } from '../contexts/LeadsContext';

// Simple SVG for the hamburger icon
const MenuIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

export default function Header({ currentStage, onAddLead, onSave, onExport, onToggleMobileSidebar }) {
  const { searchTerm, setSearchTerm, isLoading } = useLeads();

  return (
    <div className="header">
      <div className="header-left">
        {/* --- NEW: Hamburger Menu Button --- */}
        <button className="btn ghost mobile-menu-btn" onClick={onToggleMobileSidebar}>
          <MenuIcon />
        </button>
        <div>
          <h1 id="pageTitle">{currentStage}</h1>
          <div className="small">Single-file prototype — React Version</div>
        </div>
      </div>
      <div className="controls">
        <input
          className="input"
          placeholder="Search name / mobile / PAN"
          value={searchTerm}
          onInput={e => setSearchTerm(e.target.value)}
        />
        <button className="btn primary" onClick={onAddLead}>Add Lead</button>
        <button className="btn ghost" title="Save open form" onClick={onSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button className="btn ghost" onClick={onExport}>Export CSV</button>
      </div>
    </div>
  );
}