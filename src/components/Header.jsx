import React from 'react';
import { useLeads } from '../contexts/LeadsContext';

export default function Header({ currentStage, onAddLead, onSave, onExport }) {
  const { searchTerm, setSearchTerm, isLoading } = useLeads(); // Get state from context

  return (
    <div className="header">
      <div>
        <h1 id="pageTitle">{currentStage}</h1>
        <div className="small">Single-file prototype — React Version</div>
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