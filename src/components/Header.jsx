import React from 'react';

export default function Header({ currentStage, searchTerm, onSearch, onAddLead, onSave, onExport }) {
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
          onInput={e => onSearch(e.target.value)}
        />
        <button className="btn primary" onClick={onAddLead}>Add Lead</button>
        <button className="btn ghost" title="Save open form" onClick={onSave}>Save</button>
        <button className="btn ghost" onClick={onExport}>Export CSV</button>
      </div>
    </div>
  );
}