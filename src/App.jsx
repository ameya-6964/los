import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Constants and Utils
import { STAGES, DEFAULT_BRE, newLeadTemplate, KEY } from './constants';
import { dedupeScore } from './logic';
import { useLeads } from './contexts/LeadsContext';
import { useBre } from './contexts/BreContext';
import { useToast } from './contexts/ToastContext';
import { saveState } from './storage'; 

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
  const [currentStage, setCurrentStage] = useState('Home');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null); 
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // === Hooks ===
  const { 
    leads, 
    filteredLeads,
    fiTasks,
    deleteLead, 
    setSearchTerm,
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
    setIsMobileSidebarOpen(false); 
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLead(null);
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
    setIsMobileSidebarOpen(false); 
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
      await saveState({ leads: [], bre: DEFAULT_BRE }); 
      window.location.reload(); 
    }
  };
  
  const handleSaveForm = () => {
    if (!isFormOpen) {
      return showToast('Open a lead to save', 'warning');
    }
    const saveButton = document.getElementById('lead-form-save-button');
    if (saveButton) {
      saveButton.click();
    }
  };

  // --- Mobile Toggle Functions ---
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(prev => !prev);
  };
  
  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleSetStage = (stage) => {
    setCurrentStage(stage);
    closeMobileSidebar();
  };

  return (
    <div className={`app ${isMobileSidebarOpen ? 'mobile-sidebar-active' : ''}`}>
      <Sidebar
        currentStage={currentStage}
        onSetStage={handleSetStage} 
        onGlobalDedupe={handleGlobalDedupe}
        onOpenBre={() => openModal('bre')}
        onClearData={handleClearData}
        STAGES={STAGES}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />
      
      <main className="main">
        {/* --- NEW WRAPPER ADDED --- */}
        <div className="main-content-wrapper">
          <Header
            currentStage={currentStage}
            onSearch={setSearchTerm}
            onAddLead={() => handleOpenForm(null)}
            onSave={handleSaveForm}
            onExport={handleExport}
            onToggleMobileSidebar={toggleMobileSidebar}
          />
          
          {currentStage === 'Home' && !isFormOpen && (
            <>
              <StatsCards onSetStage={handleSetStage} />
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
              leads={filteredLeads.filter(l => currentStage === 'Home' || l.status === currentStage)}
              onView={handleViewLead}
              onEdit={handleOpenForm}
              onDelete={handleDeleteLead}
            />
          )}
          
          <div className="panel small">
            <strong>Data stored in localStorage key:</strong> <code>{KEY}</code>
          </div>
        </div>
        {/* --- END OF NEW WRAPPER --- */}
      </main>

      <div 
        className="sidebar-backdrop" 
        onClick={closeMobileSidebar}
      ></div>

      {/* --- Modals --- */}
      {activeModal === 'view' && <ViewModal lead={modalData} onClose={closeModal} />}
      {activeModal === 'dedupe' && <DedupeModal data={modalData} onClose={closeModal} />}
      {activeModal === 'globalDedupe' && <GlobalDedupeModal groups={modalData} onClose={closeModal} onViewLead={(id) => { closeModal(); handleViewLead(id); }} />}
      {activeModal === 'bre' && <BreConfigModal onClose={closeModal} />}
      {activeModal === 'fiAssign' && <FiAssignModal leadId={modalData} onClose={closeModal} />}
    </div>
  );
}