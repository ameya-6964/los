import React from 'react';
import { useLeads } from '../../contexts/LeadsContext';

const CARD_STAGES = ['New Lead', 'QDE', 'DDE', 'Underwriting', 'Sanctioned', 'Disbursed', 'Active', 'Rejected'];

export default function StatsCards({ onSetStage }) {
  const { navCounts } = useLeads(); // Get counts from context

  return (
    <div className="cards">
      {CARD_STAGES.map(s => (
        <div key={s} className="card" onClick={() => onSetStage(s)}>
          <div style={{ fontWeight: 700 }}>{s}</div>
          <div className="small">{navCounts[s] || 0} leads</div>
        </div>
      ))}
    </div>
  );
}