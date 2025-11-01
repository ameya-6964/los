import axios from 'axios';

// Set the base URL for all our API requests
const API_URL = 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
});

// --- Leads API ---
export const apiFetchLeads = () => api.get('/leads');
export const apiSaveLead = (lead) => {
  // If the lead has an ID, it's an update (PUT). If not, it's a create (POST).
  if (lead.id) {
    return api.put(`/leads/${lead.id}`, lead);
  }
  return api.post('/leads', lead);
};
export const apiDeleteLead = (leadId) => api.delete(`/leads/${leadId}`);

// --- BRE API ---
export const apiFetchBre = () => api.get('/bre');
export const apiSaveBre = (newBre) => api.put('/bre', newBre);

// --- Auth API ---
export const apiLogin = (userId) => api.post('/login', { userId });