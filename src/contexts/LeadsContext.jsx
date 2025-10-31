import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { STAGES } from '../constants';
import { apiFetchLeads, apiSaveLead, apiDeleteLead } from '../api';
import { useToast } from './ToastContext';
import { uid, addAudit, getNextStage, getPrevStage, runBRELogic } from '../logic';
import { useBre } from './BreContext';

const LeadsContext = createContext();

export const useLeads = () => {
  return useContext(LeadsContext);
};

export const LeadsProvider = ({ children }) => {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  const { bre } = useBre(); // Get BRE config from its own context

  // Load leads from API on mount
  useEffect(() => {
    apiFetchLeads().then(fetchedLeads => {
      setLeads(fetchedLeads);
      setIsLoading(false);
    }).catch(err => {
      showToast('Failed to fetch leads', 'error');
      setIsLoading(false);
    });
  }, [showToast]);

  // Memoized values
  const navCounts = useMemo(() => {
    return leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = (searchTerm || '').toLowerCase();
    return (leads || []).filter(l =>
      (!q ||
        (l.name || '').toLowerCase().includes(q) ||
        (l.mobile || '').includes(q) ||
        (l.pan || '').toLowerCase().includes(q)
      )
    );
  }, [leads, searchTerm]);

  const fiTasks = useMemo(() => {
    return (leads || []).filter(l => l.status === 'FI');
  }, [leads]);

  // Core actions
  const saveLead = useCallback(async (formLead, specificAuditMsg = '') => {
    setIsLoading(true);
    try {
      const name = (formLead.name || '').trim();
      const mobile = (formLead.mobile || '').trim();
      if (!name) throw new Error('Name required');
      if (!/^\d{10}$/.test(mobile)) throw new Error('Valid 10-digit mobile required');

      let leadToSave = { ...formLead, updatedAt: new Date().toISOString() };
      
      const breRes = runBRELogic(leadToSave, bre);
      leadToSave = { 
        ...leadToSave, 
        decision: breRes.decision, 
        risk: breRes.risk, 
        foir: formLead.foir || breRes.foir
      };
      
      const isNew = !leadToSave.id;
      // make the intent explicit with parentheses
      const defaultAudit = (isNew ? 'Created' : 'Updated') + ` at ${leadToSave.status}. BRE:${breRes.decision}. ${breRes.reasons.join('; ')}`;
      const auditMsg = specificAuditMsg || defaultAudit;
      leadToSave = addAudit(leadToSave, auditMsg);

      if (isNew) {
        leadToSave.id = uid();
        leadToSave.createdAt = new Date().toISOString();
      }

      const saved = await apiSaveLead(leadToSave);
      
      if (isNew) {
        setLeads(prev => [...prev, saved]);
        showToast('Lead created!', 'success');
      } else {
        setLeads(prev => prev.map(l => (l.id === saved.id ? saved : l)));
        showToast('Lead updated!', 'success');
      }
      return true; // Signal success
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
      return false; // Signal failure
    } finally {
      setIsLoading(false);
    }
  }, [bre, showToast]);

  const deleteLead = useCallback(async (leadId) => {
    if (!window.confirm('Delete lead?')) return;
    setIsLoading(true);
    try {
      await apiDeleteLead(leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      showToast('Lead deleted.', 'success');
    } catch (e) {
      showToast('Failed to delete lead', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const updateLead = useCallback(async (updatedLead) => {
    setIsLoading(true);
    try {
      const saved = await apiSaveLead(updatedLead);
      setLeads(prev => prev.map(l => (l.id === saved.id ? saved : l)));
      return saved;
    } catch (e) {
      showToast('Failed to update lead', 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Workflow actions
  const moveNext = useCallback(async (id) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const next = getNextStage(lead.status, STAGES);
    if (!next) return showToast('No next stage', 'warning');

    if (next === 'Underwriting' && (!lead.bank || !lead.account || !lead.ifsc)) {
      const newDev = { id: uid(), name: 'Missing DDE', expected: 'Bank/Account/IFSC', actual: 'Missing', status: 'Open', remarks: 'Blocked' };
      const updatedLead = addAudit({ ...lead, deviations: [...(lead.deviations || []), newDev] }, 'Blocked to UW: missing DDE');
      await updateLead(updatedLead);
      showToast('DDE missing — deviation created', 'warning');
      return;
    }
    const updatedLead = addAudit({ ...lead, status: next }, 'Moved to ' + next);
    await updateLead(updatedLead);
  }, [leads, updateLead, showToast]);

  const moveBack = useCallback(async (id) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const prev = getPrevStage(lead.status, STAGES);
    if (!prev || prev === 'Home') {
      showToast('No previous stage', 'warning');
      return;
    }

    const updatedLead = addAudit({ ...lead, status: prev }, "Sent back to 'DDE'");
    await updateLead(updatedLead);
    showToast(`Sent back to ${prev}`, 'info');
  }, [leads, updateLead, showToast]);

  const assignFiAgent = useCallback(async (leadId, agentName) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const updatedLead = addAudit({ ...lead, fieldAgent: agentName }, `Assigned FI agent ${agentName}`);
    await updateLead(updatedLead);
    showToast('Agent assigned', 'success');
  }, [leads, updateLead, showToast]);

  const value = {
    leads,
    isLoading,
    navCounts,
    filteredLeads,
    fiTasks,
    searchTerm,
    setSearchTerm,
    saveLead,
    deleteLead,
    moveNext,
    moveBack,
    assignFiAgent
  };

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
};
