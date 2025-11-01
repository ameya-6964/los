import React from 'react';
import ModalWrapper from './ModalWrapper';
import { safe } from '../../logic'; // <-- This is the fix

export default function DedupeModal({ data, onClose }) {
  const { q, d, score } = data;
  return (
    <ModalWrapper title="QDE ↔ DDE Compare" onClose={onClose}>
      <div>Confidence: <strong>{score}%</strong></div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <div style={{ flex: 1 }}>
          <h4>QDE</h4>
          {Object.keys(q).map(k => <div key={k} style={{ padding: '6px' }}>{k}: {safe(q[k])}</div>)}
        </div>
        <div style={{ flex: 1 }}>
          <h4>DDE</h4>
          {Object.keys(d).map(k => <div key={k} style={{ padding: '6px' }}>{k}: {safe(d[k])}</div>)}
        </div>
      </div>
    </ModalWrapper>
  );
}