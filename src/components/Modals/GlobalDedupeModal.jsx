import React from 'react';
import ModalWrapper from './ModalWrapper';
import { safe } from '../../utils';

export default function GlobalDedupeModal({ groups, onClose, onViewLead }) {
  return (
    <ModalWrapper title="Global Dedupe" onClose={onClose}>
      {groups.length === 0 ? (
        <div>No duplicates found</div>
      ) : (
        groups.map((g, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 700 }}>Group {i + 1}</div>
            <table>
              <tbody>
                {g.map(r => (
                  <tr key={r.id}>
                    <td>{safe(r.name || '')}</td>
                    <td>{safe(r.mobile || '')}</td>
                    <td>{safe(r.pan || '')}</td>
                    <td><button className="btn" onClick={() => onViewLead(r.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </ModalWrapper>
  );
}