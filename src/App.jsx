import React, { useState } from 'react';

// Constants and Utils
import { STAGES, newLeadTemplate } from './constants';
import { dedupeScore } from './logic';
import { useLeads } from './contexts/LeadsContext';
import { useBre } from './contexts/BreContext';
import { useToast } from './contexts/ToastContext';

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

// Local storage key used to persist app data (was referenced as KEY)
const KEY = 'app_data_v1';

export default function App() {
  // === State ===
  const [currentStage, setCurrentStage] = useState('Home');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null); // Holds the lead being edited
  
  // Modal State
  const [activeModal, setActiveModal] = useState(null); // 'view', 'dedupe', 'globalDedupe', 'bre', 'fiAssign'
  const [modalData, setModalData] = useState(null);

  // === Hooks ===
  const { 
    leads = [], 
    filteredLeads = [],
    fiTasks = [],
    saveLead, 
    deleteLead, 
    setSearchTerm,
    isLoading
  } = useLeads();
  
  const { resetBre } = useBre();
  const { showToast } = useToast();

  // === Core Handlers ===
  const handleOpenForm = (leadToEdit = null) => {
    if (leadToEdit) {
      setEditingLead(leadToEdit);
    } else {
      const defaultStatus = (currentStage === 'Home' || !currentStage) ? 'New Lead' : currentStage;
      setEditingLead({ ...newLeadTemplate, status: defaultStatus });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLead(null);
  };

  const handleSaveLeadSuccess = () => {
    handleCloseForm();
  };

  const handleDeleteLead = (id) => {
    if (isFormOpen) {
      return showToast('Close the form before deleting a lead', 'warning');
    }
    deleteLead(id);
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
    const lead = (leads || []).find(l => l.id === id);
    if (lead) openModal('view', lead);
  };
  
  const handleRunDedupe = (formLead) => {
    const q = { name: formLead.name, mobile: formLead.mobile, pan: formLead.pan, aadhaar: formLead.aadhaar, email: formLead.email, dob: formLead.dob };
    const d = { ...q, account: formLead.account, ifsc: formLead.ifsc };
    const score = dedupeScore(q, d);
    openModal('dedupe', { q, d, score });
  };
  
  const handleGlobalDedupe = () => {
    const index = {};
    (leads || []).forEach(l => {
      if (l.pan) { index['PAN:' + l.pan] = index['PAN:' + l.pan] || []; index['PAN:' + l.pan].push(l); }
      if (l.mobile) { index['MOB:' + l.mobile] = index['MOB:' + l.mobile] || []; index['MOB:' + l.mobile].push(l); }
      if (l.aadhaar) { index['AAD:' + l.aadhaar] = index['AAD:' + l.aadhaar] || []; index['AAD:' + l.aadhaar].push(l); }
    });
    const groups = Object.values(index).filter(g => g.length > 1);
    openModal('globalDedupe', groups);
  };

  // === Other Tools ===
  const handleExport = () => {
    if (!leads || leads.length === 0) return showToast('No leads to export', 'warning');
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
    showToast('Leads exported', 'success');
  };

  const handleClearData = async () => {
    if (window.confirm('Clear ALL data? This is permanent.')) {
      // Clear the persisted app data and reset BRE config
      try {
        localStorage.removeItem(KEY);
        if (typeof resetBre === 'function') resetBre(); // reset BRE to defaults (if available)
        window.location.reload(); // easiest way to ensure all contexts re-initialize
        showToast('All data cleared', 'success');
      } catch (err) {
        showToast('Failed to clear data', 'error');
      }
    }
  };
  
  const handleSaveForm = () => {
    if (!isFormOpen) {
      return showToast('Open a lead to save', 'warning');
    }
    const saveButton = document.getElementById('lead-form-save-button');
    if (saveButton) {
      saveButton.click();
    } else {
      // Fallback: try calling saveLead directly if editingLead exists and form provides data
      showToast('Could not find form save button', 'warning');
    }
  };

  return (
    <div className="app">
      <Sidebar
        currentStage={currentStage}
        onSetStage={setCurrentStage}
        onGlobalDedupe={handleGlobalDedupe}
        onOpenBre={() => openModal('bre')}
        onClearData={handleClearData}
        STAGES={STAGES}
      />
      
      <main className="main">
        <Header
          currentStage={currentStage}
          onSearch={setSearchTerm}
          onAddLead={() => handleOpenForm(null)}
          onSave={handleSaveForm}
          onExport={handleExport}
        />
        
        {currentStage === 'Home' && !isFormOpen && (
          <>
            <StatsCards onSetStage={setCurrentStage} />
            <FiWidget fiTasks={fiTasks} onAssign={(id) => openModal('fiAssign', id)} />
          </>
        )}
        
        {isFormOpen && (
          <LeadForm
            key={editingLead ? editingLead.id : 'new'}
            initialLead={editingLead}
            onSaveSuccess={handleCloseForm}
            onCancel={handleCloseForm}
            onRunDedupe={handleRunDedupe}
          />
        )}
        
        {!isFormOpen && (
          <LeadTable
            leads={(filteredLeads || []).filter(l => currentStage === 'Home' || l.status === currentStage)}
            onView={handleViewLead}
            onEdit={handleOpenForm}
            onDelete={handleDeleteLead}
          />
        )}
        
        <div className="panel small">
          <strong>Data stored in localStorage key:</strong> <code>{KEY}</code>
        </div>
      </main>

      {/* --- Modals --- */}
      {activeModal === 'view' && <ViewModal lead={modalData} onClose={closeModal} />}
      {activeModal === 'dedupe' && <DedupeModal data={modalData} onClose={closeModal} />}
      {activeModal === 'globalDedupe' && <GlobalDedupeModal groups={modalData} onClose={closeModal} onViewLead={(id) => { closeModal(); handleViewLead(id); }} />}
      {activeModal === 'bre' && <BreConfigModal onClose={closeModal} />}
      {activeModal === 'fiAssign' && <FiAssignModal leadId={modalData} onClose={closeModal} />}
    </div>
  );
}
