import { loadState, saveState } from './storage';

const SIMULATED_DELAY = 500; // 500ms delay

// --- Leads API ---

export const apiFetchLeads = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const state = loadState();
      resolve([...state.leads]); // Return a copy
    }, SIMULATED_DELAY);
  });
};

export const apiSaveLead = (leadToSave) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const state = loadState();
      const isUpdate = state.leads.some(l => l.id === leadToSave.id);
      let newLeads;

      if (isUpdate) {
        newLeads = state.leads.map(l => (l.id === leadToSave.id ? leadToSave : l));
      } else {
        newLeads = [...state.leads, leadToSave];
      }
      
      saveState({ ...state, leads: newLeads });
      resolve(leadToSave);
    }, SIMULATED_DELAY);
  });
};

export const apiDeleteLead = (leadId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const state = loadState();
      const newLeads = state.leads.filter(l => l.id !== leadId);
      saveState({ ...state, leads: newLeads });
      resolve(leadId);
    }, SIMULATED_DELAY);
  });
};

// --- BRE API ---

export const apiFetchBre = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const state = loadState();
      resolve({ ...state.bre }); // Return a copy
    }, SIMULATED_DELAY);
  });
};

export const apiSaveBre = (newBre) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const state = loadState();
      saveState({ ...state, bre: newBre });
      resolve(newBre);
    }, SIMULATED_DELAY);
  });
};