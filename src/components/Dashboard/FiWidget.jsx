import React from 'react';
import { safe } from '../../logic';
import { useLeads } from '../../contexts/LeadsContext';

export default function FiWidget({ onAssign }) {
  const { fiTasks } = useLeads(); // Get tasks from context

  return (
    <div className="panel" id="fiWidget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><strong>Field Investigation Tasks</strong><div className="small">Leads in FI stage</div></div>
      </div>
      <div id="fiList" style={{ marginTop: '10px' }}>
        {fiTasks.length === 0 ? (
          <div className="small">No FI tasks</div>
        ) : (
          fiTasks.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', border: '1px solid #eef2f7', borderRadius: '8px', marginBottom: '6px' }}>
              <div><strong>{safe(t.name)}</strong><div className="small">Mobile: {safe(t.mobile)}</div></div>
              <div><button className="btn" onClick={() => onAssign(t.id)}>Assign</button></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}