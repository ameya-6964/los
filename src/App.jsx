import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Constants and Utils
import { STAGES, DEFAULT_BRE, newLeadTemplate } from './constants';
import { loadState, saveState, toast, uid, addAudit, getNextStage, getPrevStage, runBRELogic, dedupeScore } from './utils';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsCards from './components/Dashboard/StatsCards';
import FiWidget from './components/Dashboard/FiWidget';
import LeadTable from './components/LeadTable';
import LeadForm from './components/LeadForm/LeadForm';
import ViewModal from './components/Modals/ViewModal';
import DedupeModal from './components/Modals/DedupeModal';
import GlobalDedupeModal from './components/Modals/GlobalDedupeModal';
import BreConfigModal from './components/Modals/BreConfigModal';
import FiAssignModal from './components/Modals/FiAssignModal';

export default function App() {
  // === State ===
  const [leads, setLeads] = useState(() => loadState().leads);
  const [bre, setBre] = useState(() => loadState().bre);
  const [currentStage, setCurrentStage] = useState('Home');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null); // Holds the lead being edited
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [activeModal, setActiveModal] = useState(null); // 'view', 'dedupe', 'globalDedupe', 'bre', 'fiAssign'
  const [modalData, setModalData] = useState(null);

  // === Effects ===
  useEffect(() => {
    saveState({ leads, bre });
  }, [leads, bre]);

  // === Memoized Values ===
  const navCounts = useMemo(() => {
    return leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return leads.filter(l =>
      (currentStage === 'Home' ? true : l.status === currentStage) &&
      (!q ||
        (l.name || '').toLowerCase().includes(q) ||
        (l.mobile || '').includes(q) ||
        (l.pan || '').toLowerCase().includes(q)
      )
    );
  }, [leads, currentStage, searchTerm]);

  const fiTasks = useMemo(() => {
    return leads.filter(l => l.status === 'FI');
  }, [leads]);
  
  // === Core Handlers ===
  const handleOpenForm = (leadToEdit = null) => {
    if (leadToEdit) {
      setEditingLead(leadToEdit);
    } else {
      // Create a new lead template, defaulting to the current stage
      const defaultStatus = (currentStage === 'Home' || !currentStage) ? 'New Lead' : currentStage;
      setEditingLead({ ...newLeadTemplate, status: defaultStatus });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLead(null);
  };

  const handleSaveLead = (formLead, specificAuditMsg = '') => {
    try {
      const name = (formLead.name || '').trim();
      const mobile = (formLead.mobile || '').trim();
      if (!name) return toast('Name required');
      if (!/^\d{10}$/.test(mobile)) return toast('Valid 10-digit mobile required');

      let leadToSave = { ...formLead, updatedAt: new Date().toISOString() };
      
      const breRes = runBRELogic(leadToSave, bre);
      // Merge BRE results, but don't overwrite foir if it was manually entered
      leadToSave = { 
        ...leadToSave, 
        decision: breRes.decision, 
        risk: breRes.risk, 
        foir: formLead.foir || breRes.foir // Prioritize manually entered FOIR
      };
      
      const auditMsg = specificAuditMsg || (leadToSave.id ? 'Updated' : 'Created') + ` at ${leadToSave.status}. BRE:${breRes.decision}. ${breRes.reasons.join('; ')}`;
      leadToSave = addAudit(leadToSave, auditMsg);

      if (leadToSave.id) { // Update
        setLeads(prevLeads => prevLeads.map(l => l.id === leadToSave.id ? leadToSave : l));
        toast('Lead updated');
      } else { // Create
        leadToSave.id = uid();
        leadToSave.createdAt = new Date().toISOString();
        setLeads(prevLeads => [...prevLeads, leadToSave]);
        toast('Lead created');
      }
      handleCloseForm();
    } catch (e) {
      console.error(e);
      toast('Save failed (see console)');
    }
  };
  
  const handleDeleteLead = (id) => {
    if (window.confirm('Delete lead?')) {
      setLeads(prev => prev.filter(l => l.id !== id));
    }
  };
  
  const handleStageChange = (id, newStage, auditMsg) => {
    setLeads(prev => prev.map(l => 
      l.id === id ? addAudit({ ...l, status: newStage, updatedAt: new Date().toISOString() }, auditMsg) : l
    ));
  };

  const handleMoveNext = (id) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const next = getNextStage(lead.status, STAGES);
    if (!next) return toast('No next stage');

    if (next === 'Underwriting' && (!lead.bank || !lead.account || !lead.ifsc)) {
      const newDev = { id: uid(), name: 'Missing DDE', expected: 'Bank/Account/IFSC', actual: 'Missing', status: 'Open', remarks: 'Blocked' };
      setLeads(prev => prev.map(l => l.id === id ? addAudit({ ...l, deviations: [...(l.deviations || []), newDev] }, 'Blocked to UW: missing DDE') : l));
      return toast('DDE missing — deviation created');
    }
    handleStageChange(id, next, 'Moved to ' + next);
  };
  
  const handleMoveBack = (id) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const prev = getPrevStage(lead.status, STAGES);
    if (!prev || prev === 'Home') return toast('No previous stage');
    handleStageChange(id, prev, 'Sent back to ' + prev);
  };

  // === Modal Handlers ===
  const openModal = (type, data = null) => {
    setModalData(data);
    setActiveModal(type);
  };
  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };
  
  const handleViewLead = (id) => {
    const lead = leads.find(l => l.id === id);
    if (lead) openModal('view', lead);
  };
  
  const handleRunDedupe = (formLead) => {
    const q = { name: formLead.name, mobile: formLead.mobile, pan: formLead.pan, aadhaar: formLead.aadhaar, email: formLead.email, dob: formLead.dob };
    const d = { ...q, account: formLead.account, ifsc: formLead.ifsc };
    const score = dedupeScore(q, d);
    openModal('dedupe', { q, d, score });
  };
  
  //
  // --- THIS IS THE FIXED FUNCTION ---
  //
  const handleGlobalDedupe = () => {
    const index = {};
    leads.forEach(l => {
      if (l.pan) { index['PAN:' + l.pan] = index['PAN:' + l.pan] || []; index['PAN:' + l.pan].push(l); }
      if (l.mobile) { index['MOB:' + l.mobile] = index['MOB:' + l.mobile] || []; index['MOB:' + l.mobile].push(l); }
      if (l.aadhaar) { index['AAD:' + l.aadhaar] = index['AAD:' + l.aadhaar] || []; index['AAD:' + l.aadhaar].push(l); }
    });
    const groups = Object.values(index).filter(g => g.length > 1);
    openModal('globalDedupe', groups);
  };
  // --- END OF FIX ---
  //

  const handleSaveBreConfig = (newBre) => {
    setBre(newBre);
    closeModal();
    toast('BRE saved');
  };
  
  const handleAssignFi = (agentName) => {
    if (!agentName) return toast('Agent name required');
    const leadId = modalData; // modalData holds the leadId
    
    setLeads(prev => prev.map(l => 
      l.id === leadId ? addAudit({ ...l, fieldAgent: agentName }, `Assigned FI agent ${agentName}`) : l
    ));
    
    closeModal();
    toast('Agent assigned');
  };

  // === Other Tools ===
  const handleExport = () => {
    if (!leads || leads.length === 0) return toast('No leads');
    const header = ['id', 'name', 'mobile', 'email', 'pan', 'aadhaar', 'product', 'status', 'decision', 'cibil', 'income', 'requested', 'createdAt'];
    const rows = [header.join(',')].concat(
      leads.map(r =>
        header.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(',')
      )
    );
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    if (window.confirm('Clear ALL data? This is permanent.')) {
      setLeads([]);
      setBre(DEFAULT_BRE);
      toast('All data cleared');
    }
  };
  
  const handleSaveForm = () => {
    if (!isFormOpen) {
      return toast('Open a lead to save');
    }
    // Clicks the save button inside the LeadForm component
    const saveButton = document.getElementById('lead-form-save-button');
    if (saveButton) {
      saveButton.click();
    }
  };

  return (
    <div className="app">
      <Sidebar
        currentStage={currentStage}
        onSetStage={setCurrentStage}
        navCounts={navCounts}
        onGlobalDedupe={handleGlobalDedupe}
        onOpenBre={() => openModal('bre')}
        onClearData={handleClearData}
        STAGES={STAGES}
      />
      
      <main className="main">
        <Header
          currentStage={currentStage}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          onAddLead={() => handleOpenForm(null)}
          onSave={handleSaveForm}
          onExport={handleExport}
        />
        
        {currentStage === 'Home' && !isFormOpen && (
          <>
            <StatsCards navCounts={navCounts} onSetStage={setCurrentStage} />
            <FiWidget fiTasks={fiTasks} onAssign={(id) => openModal('fiAssign', id)} />
          </>
        )}
        
        {isFormOpen && (
          <LeadForm
            key={editingLead ? editingLead.id : 'new'} // Re-mounts the form when lead changes
            initialLead={editingLead}
            onSave={handleSaveLead}
            onCancel={handleCloseForm}
            breConfig={bre}
            onRunDedupe={handleRunDedupe}
          />
        )}
        
        {!isFormOpen && (
          <LeadTable
            leads={filteredLeads}
            onView={handleViewLead}
            onEdit={handleOpenForm}
            onNext={handleMoveNext}
            onBack={handleMoveBack}
            onDelete={handleDeleteLead}
          />
        )}
        
        <div className="panel small">
          <strong>Data stored in localStorage key:</strong> Main
        </div>
      </main>

      {/* --- Modals --- */}
      {activeModal === 'view' && <ViewModal lead={modalData} onClose={closeModal} />}
      {activeModal === 'dedupe' && <DedupeModal data={modalData} onClose={closeModal} />}
      {activeModal === 'globalDedupe' && <GlobalDedupeModal groups={modalData} onClose={closeModal} onViewLead={(id) => { closeModal(); handleViewLead(id); }} />}
      {activeModal === 'bre' && <BreConfigModal bre={bre} onClose={closeModal} onSave={handleSaveBreConfig} onReset={() => setBre(DEFAULT_BRE)} />}
      {activeModal === 'fiAssign' && <FiAssignModal onClose={closeModal} onAssign={handleAssignFi} />}
    </div>
  );
}