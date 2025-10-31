export const KEY = 'los_v1';
export const DEFAULT_BRE = { minCibil: 650, minAge: 21, maxAge: 65, minIncome: 15000, maxFoir: 50 };
export const STAGES = ['Home', 'New Lead', 'QDE', 'DDE', 'Document Collection', 'FI', 'Underwriting', 'Sanctioned', 'Disbursed', 'Active', 'Rejected'];

export const TABS = [
  { id: 'qde', label: 'QDE' },
  { id: 'dde', label: 'DDE' },
  { id: 'docs', label: 'Documents' },
  { id: 'fi', label: 'FI' },
  { id: 'uw', label: 'Underwriting' },
  { id: 'san', label: 'Sanction' },
  { id: 'disb', label: 'Disbursement' },
  { id: 'dev', label: 'Deviations' },
];

export const newLeadTemplate = {
  id: '', createdAt: '', updatedAt: '', status: 'New Lead', name: '', dob: '', 
  gender: '', mobile: '', email: '', pan: '', aadhaar: '', marital: '', 
  education: '', addr_current: '', addr_perm: '', employment: '', employer: '', 
  experience: 0, income: 0, requested: 0, purpose: '', product: '', bank: '', 
  account: '', ifsc: '', salary_method: 'NEFT', salary_net: 0, 
  existing_loans: 'No', total_emi: 0, cc_limit: 0, gst: '', fieldAgent: '', 
  residenceVerified: 'No', businessVerified: 'No', lat: '', lng: '', 
  fi_photo: '', neighbor_feedback: '', cibil: 0, foir: 0, risk: '', 
  eligible: '', reco_product: '', uwRemarks: '', sanctionAmt: 0, 
  sanctionROI: 0, sanctionTenure: 0, sanctionEMI: '', sanctionRemarks: '', 
  disbAmt: 0, utr: '', disbDate: '', mobileVerified: false, panVerified: false, 
  emailVerified: false, documents: [], deviations: [], audit: [], decision: '',
};