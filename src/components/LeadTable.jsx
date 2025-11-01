import React from 'react';
import { safe, getNextStage, getPrevStage } from '../logic';
import { STAGES } from '../constants';
import { useLeads } from '../contexts/LeadsContext';
import { useAuth } from '../contexts/AuthContext'; 
import { USER_ROLES } from '../logic'; // <-- FIX: Import USER_ROLES directly

export default function LeadTable({ leads, onView, onEdit }) {
  const { moveNext, moveBack, deleteLead } = useLeads();
  const { currentUser, formPermissions } = useAuth(); // <-- Get user and permissions

  // Filter leads again based on role
  const roleFilteredLeads = leads.filter(lead => {
    // This line will now work
    if (currentUser.role === USER_ROLES.FIELD_INVESTIGATOR && lead.fieldAgent !== currentUser.name) {
      return false; // Hide leads not assigned to this agent
    }
    // All other roles can see all leads in their permitted stages
    return true;
  });

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
          {roleFilteredLeads.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '12px' }}>No leads</td></tr>
          ) : (
            roleFilteredLeads.map(r => {
              const next = getNextStage(r.status, STAGES);
              const prev = getPrevStage(r.status, STAGES);
              
              // Check if user can edit *any* part of the form
              const canEdit = Object.values(formPermissions).some(p => p === true);
              const isAdmin = currentUser.role === USER_ROLES.ADMIN;
              
              return (
                <tr key={r.id}>
                  <td>{safe(r.name)}</td>
                  <td>{safe(r.mobile)}</td>
                  <td>{safe(r.product || '')}</td>
                  <td>{safe(r.status)}</td>
                  <td>{safe(r.decision || '')}</td>
                  <td>
                    <button className="action-btn view" onClick={() => onView(r.id)}>View</button>
                    
                    {/* Only show Edit button if user has permission */}
                    {canEdit && <button className="action-btn edit" onClick={() => onEdit(r)}>Edit</button>}
                    
                    {/* Only Admin can move stages from the table */}
                    {isAdmin && next && <button className="action-btn next" onClick={() => moveNext(r.id)}>Next</button>}
                    {isAdmin && prev && prev !== 'Home' && <button className="action-btn back" onClick={() => moveBack(r.id)}>Back</button>}
                    {isAdmin && <button className="action-btn delete" onClick={() => deleteLead(r.id)}>Delete</button>}
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