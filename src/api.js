import axios from 'axios';

// Set the base URL for all our API requests
const API_URL = 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
});

// --- Leads API ---
export const apiFetchLeads = () => api.get('/leads');

// --- FIX: Create two distinct functions ---

// Use POST for creating a new lead
export const apiCreateLead = (lead) => {
  return api.post('/leads', lead);
};

// Use PUT for updating an existing lead
export const apiUpdateLead = (lead) => {
  return api.put(`/leads/${lead.id}`, lead);
};
// --- END OF FIX ---

export const apiDeleteLead = (leadId) => api.delete(`/leads/${leadId}`);

// --- BRE API ---
export const apiFetchBre = () => api.get('/bre');
export const apiSaveBre = (newBre) => api.put('/bre', newBre);

// --- Auth API ---
export const apiLogin = (userId) => api.post('/login', { userId });