import React from 'react';
import ModalWrapper from './ModalWrapper';
import { safe } from '../../utils';

export default function ViewModal({ lead, onClose }) {
  return (
    <ModalWrapper title="Lead Details" onClose={onClose}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3>{safe(lead.name)}</h3>
          <div><strong>Mobile:</strong> {safe(lead.mobile)}</div>
          <div><strong>Email:</strong> {safe(lead.email)}</div>
          <div><strong>PAN:</strong> {safe(lead.pan)}</div>
          <div style={{ marginTop: '8px' }}><strong>Documents</strong></div>
          <div className="small">
            {(lead.documents || []).map(d => <div key={d.id}>{safe(d.name)} ({safe(d.type)})</div>)}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h4>Audit</h4>
          <div className="audit">
            {(lead.audit || []).slice().reverse().map((a, i) => <div key={i}>{safe(a.ts)} — {safe(a.msg)}</div>)}
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}