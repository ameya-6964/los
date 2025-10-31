import React from 'react';
import { safe, getNextStage, getPrevStage } from '../utils';
import { STAGES } from '../constants';

export default function LeadTable({ leads, onView, onEdit, onNext, onBack, onDelete }) {
  return (
    <div className="panel">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Mobile</th>
            <th>Product</th>
            <th>Stage</th>
            <th>Decision</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '12px' }}>No leads</td></tr>
          ) : (
            leads.map(r => {
              const next = getNextStage(r.status, STAGES);
              const prev = getPrevStage(r.status, STAGES);
              return (
                <tr key={r.id}>
                  <td>{safe(r.name)}</td>
                  <td>{safe(r.mobile)}</td>
                  <td>{safe(r.product || '')}</td>
                  <td>{safe(r.status)}</td>
                  <td>{safe(r.decision || '')}</td>
                  <td>
                    <button className="action-btn view" onClick={() => onView(r.id)}>View</button>
                    <button className="action-btn edit" onClick={() => onEdit(r)}>Edit</button>
                    {next && <button className="action-btn next" onClick={() => onNext(r.id)}>Next</button>}
                    {prev && prev !== 'Home' && <button className="action-btn back" onClick={() => onBack(r.id)}>Back</button>}
                    <button className="action-btn delete" onClick={() => onDelete(r.id)}>Delete</button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}