import './index.css' // Import CSS styles
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Home, ChevronsRight, Users, Settings, Trash2, Menu, 
  Search, Plus, Save, Download, Eye, Edit, ChevronLeft, 
  ChevronRight, X, Loader2, CheckCircle2, XCircle, Circle, 
  FileText, UploadCloud, ShieldCheck, Check, DollarSign, 
  FileWarning, Landmark, AlertTriangle
} from 'lucide-react';

// --- Constants ---
const KEY = 'los_v1_react';
const STAGES = ['Home','New Lead','QDE','DDE','Document Collection','FI','Underwriting','Sanctioned','Disbursed','Active','Rejected'];
const DEFAULT_BRE = { minCibil: 650, minAge: 21, maxAge: 65, minIncome: 15000, maxFoir: 50 };

const TAB_OPTIONS = [
  { id: 'qde', label: 'QDE', icon: FileText },
  { id: 'dde', label: 'DDE', icon: Landmark },
  { id: 'docs', label: 'Documents', icon: UploadCloud },
  { id: 'fi', label: 'FI', icon: Users },
  { id: 'uw', label: 'Underwriting', icon: ShieldCheck },
  { id: 'san', label: 'Sanction', icon: Check },
  { id: 'disb', label: 'Disbursement', icon: DollarSign },
  { id: 'dev', label: 'Deviations', icon: FileWarning },
];

const newLeadTemplate = {
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

// --- Helpers ---
const now = () => new Date().toISOString();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const safe = (s) => (s == null ? '' : String(s));

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        leads: parsed.leads || [],
        bre: parsed.bre || DEFAULT_BRE,
      };
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  return { leads: [], bre: DEFAULT_BRE };
}

function calcEMI(P, annualRate, months) {
  P = Number(P || 0);
  annualRate = Number(annualRate || 0);
  months = Number(months || 0);
  if (!P || !annualRate || !months) return 0;
  const r = annualRate / 12 / 100;
  const emi = (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi);
}

function calculateAge(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) {
    age--;
  }
  return age;
}

function runBRELogic(lead, breConfig, proposedEmi = 0) {
  const cfg = breConfig;
  const reasons = [];
  const age = calculateAge(lead.dob);
  const cibil = Number(lead.cibil || 0);
  const income = Number(lead.income || 0);
  const existingEmi = Number(lead.total_emi || 0);
  
  const requested = Number(lead.requested || 0);
  const expectedEmi = proposedEmi > 0 ? proposedEmi : Math.round(calcEMI(requested, 12, 36));
  
  const foir = income ? Math.round(((existingEmi + expectedEmi) / income) * 10000) / 100 : 999;

  if (age == null) reasons.push('DOB missing');
  else if (age < cfg.minAge || age > cfg.maxAge) reasons.push(`Age ${age} outside ${cfg.minAge}-${cfg.maxAge}`);
  
  if (cibil && cibil < cfg.minCibil) reasons.push(`CIBIL ${cibil} < ${cfg.minCibil}`);
  if (income && income < cfg.minIncome) reasons.push(`Income ${income} < ${cfg.minIncome}`);
  if (foir && foir > cfg.maxFoir) reasons.push(`FOIR ${foir}% > ${cfg.maxFoir}%`);

  let decision = 'Hold', risk = 'Medium';
  if (reasons.length === 0) {
    decision = 'Approve';
    risk = 'Low';
  } else if (reasons.some(r => r.startsWith('Age') || r.startsWith('CIBIL'))) {
    decision = 'Reject';
    risk = 'High';
  } else {
    decision = 'Hold';
    risk = 'Medium';
  }
  
  return { decision, risk, foir, expectedEmi, reasons };
}

function tokenOverlap(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 1;
  const at = a.split(/\s+/), bt = b.split(/\s+/);
  const common = at.filter(x => bt.includes(x)).length;
  return common / Math.max(at.length, bt.length);
}

function dedupeScore(qde, dde) {
  const weights = { pan: 50, aadhaar: 50, mobile: 30, email: 20, name: 20, dob: 20, account: 30, ifsc: 10 };
  let total = 0, score = 0;
  for (const k in weights) {
    total += weights[k];
    const q = (qde[k] || '').toString().toLowerCase();
    const d = (dde[k] || '').toString().toLowerCase();
    if (!q || !d) continue;
    if (k === 'name') {
      score += tokenOverlap(q, d) * weights[k];
    } else if (k === 'dob') {
      if (q === d) score += weights[k];
    } else {
      if (q === d) score += weights[k];
      else if (q.includes(d) || d.includes(q)) score += weights[k] * 0.5;
    }
  }
  return Math.round((score / total) * 100);
}

// --- Base Components ---

const Button = React.forwardRef(({ children, onClick, variant = 'primary', className = '', ...props }, ref) => {
  const variants = {
    primary: 'bg-sky-500 text-white hover:bg-sky-600',
    ghost: 'bg-white border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
    secondary: 'bg-slate-600 text-white hover:bg-slate-700',
    link: 'bg-transparent text-sky-500 hover:text-sky-600 hover:underline p-1'
  };
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`py-2 px-3 rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

const Input = React.forwardRef(({ label, id, className = '', ...props }, ref) => (
  <div className={`flex flex-col flex-1 min-w-[160px] ${className}`}>
    {label && <label htmlFor={id} className="text-xs font-medium mb-1.5 text-slate-600">{label}</label>}
    <input
      ref={ref}
      id={id}
      className="p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
      {...props}
    />
  </div>
));

const Select = React.forwardRef(({ label, id, children, className = '', ...props }, ref) => (
  <div className={`flex flex-col flex-1 min-w-[160px] ${className}`}>
    {label && <label htmlFor={id} className="text-xs font-medium mb-1.5 text-slate-600">{label}</label>}
    <select
      ref={ref}
      id={id}
      className="p-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
      {...props}
    >
      {children}
    </select>
  </div>
));

const Textarea = React.forwardRef(({ label, id, className = '', ...props }, ref) => (
  <div className={`flex flex-col flex-1 min-w-[160px] ${className}`}>
    {label && <label htmlFor={id} className="text-xs font-medium mb-1.5 text-slate-600">{label}</label>}
    <textarea
      ref={ref}
      id={id}
      className="p-2 border border-slate-300 rounded-lg text-sm min-h-[80px] resize-vertical focus:outline-none focus:ring-2 focus:ring-sky-500"
      {...props}
    />
  </div>
));

const Modal = ({ isOpen, onClose, title, children, size = '4xl' }) => {
  if (!isOpen) return null;
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
  };
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white p-5 rounded-lg shadow-2xl w-11/12 max-h-[90vh] overflow-auto ${sizeClasses[size]}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Toast = ({ message, type, onDismiss }) => {
  if (!message) return null;

  const icons = {
    success: <CheckCircle2 className="text-emerald-500" />,
    error: <XCircle className="text-red-500" />,
    warning: <AlertTriangle className="text-amber-500" />,
  };
  const colors = {
    success: 'bg-emerald-50 border-emerald-300',
    error: 'bg-red-50 border-red-300',
    warning: 'bg-amber-50 border-amber-300',
  };

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div className={`fixed top-5 right-5 z-[100] p-4 rounded-lg border ${colors[type]} shadow-lg flex items-center`}>
      {icons[type]}
      <span className="ml-3 text-sm font-medium text-slate-700">{message}</span>
      <button onClick={onDismiss} className="ml-4 text-slate-400 hover:text-slate-600">
        <X size={18} />
      </button>
    </div>
  );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="md">
      <p className="text-slate-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Confirm</Button>
      </div>
    </Modal>
  );
}

const FormRow = ({ children }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4">{children}</div>
  );
}

// --- Modal Components ---

const BreConfigModal = ({ bre, onSave, onClose }) => {
  const [config, setConfig] = useState(bre);
  useEffect(() => setConfig(bre), [bre]);
  
  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: Number(value) }));
  };
  
  return (
    <Modal isOpen={true} onClose={onClose} title="BRE Configuration">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input label="Min CIBIL" id="cfg_cibil" type="number" value={config.minCibil} onChange={e => handleChange('minCibil', e.target.value)} />
        <Input label="Min Age" id="cfg_age_min" type="number" value={config.minAge} onChange={e => handleChange('minAge', e.target.value)} />
        <Input label="Max Age" id="cfg_age_max" type="number" value={config.maxAge} onChange={e => handleChange('maxAge', e.target.value)} />
        <Input label="Min Income" id="cfg_income" type="number" value={config.minIncome} onChange={e => handleChange('minIncome', e.target.value)} />
        <Input label="Max FOIR (%)" id="cfg_foir" type="number" value={config.maxFoir} onChange={e => handleChange('maxFoir', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => onSave(config)}>Save</Button>
      </div>
    </Modal>
  );
};

const ViewModal = ({ lead, onClose }) => {
  if (!lead) return null;
  return (
    <Modal isOpen={true} onClose={onClose} title="Lead Details" size="6xl">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-3">
          <h3 className="text-xl font-semibold text-slate-800">{safe(lead.name)}</h3>
          <p><strong>Mobile:</strong> {safe(lead.mobile)}</p>
          <p><strong>Email:</strong> {safe(lead.email)}</p>
          <p><strong>PAN:</strong> {safe(lead.pan)}</p>
          <p><strong>Status:</strong> <span className="bg-slate-200 text-slate-700 text-xs font-medium px-2 py-1 rounded-full">{safe(lead.status)}</span></p>
          <p><strong>Decision:</strong> <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            lead.decision === 'Approve' ? 'bg-emerald-100 text-emerald-700' :
            lead.decision === 'Reject' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}>{safe(lead.decision || 'N/A')}</span></p>
          <p><strong>CIBIL:</strong> {safe(lead.cibil)}</p>
          <p><strong>Income:</strong> ₹{safe(lead.income)}</p>
          <p><strong>Requested:</strong> ₹{safe(lead.requested)}</p>
        </div>
        <div className="flex-1 space-y-3">
          <h4 className="font-semibold text-slate-700">Documents</h4>
          {lead.documents.length === 0 ? (
            <p className="text-sm text-slate-500">No documents.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {lead.documents.map(d => <li key={d.id}>{d.name} ({d.type})</li>)}
            </ul>
          )}
          <h4 className="font-semibold text-slate-700 pt-3 border-t">Deviations</h4>
          {lead.deviations.length === 0 ? (
            <p className="text-sm text-slate-500">No deviations.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {lead.deviations.map(d => <li key={d.id}>{d.name} (E: {d.expected}, A: {d.actual}) - {d.status}</li>)}
            </ul>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <h4 className="font-semibold text-slate-700">Audit Trail</h4>
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg max-h-60 overflow-auto border">
            {(lead.audit || []).slice().reverse().map((a, i) => (
              <p key={i} className="mb-1.5 pb-1.5 border-b last:border-b-0 last:pb-0 last:mb-0">
                <strong className="block text-slate-800">{new Date(a.ts).toLocaleString()}</strong>
                {safe(a.msg)}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

const DedupeModal = ({ lead, onClose }) => {
  if (!lead) return null;
  
  const q = { name: lead.name, mobile: lead.mobile, pan: lead.pan, aadhaar: lead.aadhaar, email: lead.email, dob: lead.dob };
  const d = { mobile: lead.mobile, pan: lead.pan, aadhaar: lead.aadhaar, email: lead.email, dob: lead.dob, account: lead.account, ifsc: lead.ifsc };
  const score = dedupeScore(q, d);

  return (
    <Modal isOpen={true} onClose={onClose} title="QDE ↔ DDE Compare" size="4xl">
      <div className="mb-4 text-lg font-semibold">Confidence Score: {score}%</div>
      <p className="text-sm text-slate-600 mb-4">
        Note: In this React version, most QDE/DDE fields share the same data. 
        This comparison is for demonstration.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-slate-800 mb-2">QDE Fields (Source)</h4>
          {Object.entries(q).map(([k, v]) => (
            <p key={k} className="text-sm border-b py-1.5"><strong>{k}:</strong> {safe(v)}</p>
          ))}
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 mb-2">DDE Fields (Target)</h4>
          {Object.entries(d).map(([k, v]) => (
            <p key={k} className="text-sm border-b py-1.5"><strong>{k}:</strong> {safe(v)}</p>
          ))}
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <Button variant="primary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

const GlobalDedupeModal = ({ leads, onClose, onView }) => {
  const groups = useMemo(() => {
    const index = {};
    leads.forEach(l => {
      if (l.pan) { index['PAN:' + l.pan] = index['PAN:' + l.pan] || []; index['PAN:' + l.pan].push(l); }
      if (l.mobile) { index['MOB:' + l.mobile] = index['MOB:' + l.mobile] || []; index['MOB:' + l.mobile].push(l); }
      if (l.aadhaar) { index['AAD:' + l.aadhaar] = index['AAD:' + l.aadhaar] || []; index['AAD:' + l.aadhaar].push(l); }
    });
    return Object.values(index).filter(g => g.length > 1);
  }, [leads]);
  
  return (
    <Modal isOpen={true} onClose={onClose} title="Global Dedupe Results" size="6xl">
      {groups.length === 0 ? (
        <p className="text-slate-500 text-center p-8">No duplicates found across PAN, Mobile, or Aadhaar.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g, i) => (
            <div key={i} className="border rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-3">Duplicate Group {i + 1}</h4>
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                    <th className="p-2 text-left text-xs font-semibold text-slate-600 uppercase">Mobile</th>
                    <th className="p-2 text-left text-xs font-semibold text-slate-600 uppercase">PAN</th>
                    <th className="p-2 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="p-2 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {g.map(r => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="p-2 text-sm">{safe(r.name)}</td>
                      <td className="p-2 text-sm">{safe(r.mobile)}</td>
                      <td className="p-2 text-sm">{safe(r.pan)}</td>
                      <td className="p-2 text-sm">{safe(r.status)}</td>
                      <td className="p-2">
                        <Button variant="ghost" className="p-1.5" onClick={() => onView(r.id)}>
                          <Eye size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

const FiAssignModal = ({ onClose, onAssign }) => {
  const [agentName, setAgentName] = useState('');
  return (
    <Modal isOpen={true} onClose={onClose} title="Assign Field Agent" size="md">
      <Input
        label="Agent Name"
        id="fiAgentName"
        value={agentName}
        onChange={e => setAgentName(e.target.value)}
        className="mb-6"
      />
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => onAssign(agentName)} disabled={!agentName}>Assign</Button>
      </div>
    </Modal>
  );
};

// --- Form Tab Components ---

const VerificationBar = ({ lead, onFieldChange, onVerify, statuses }) => {
  return (
    <FormRow>
      <div className="flex-1 flex flex-col">
        <label className="text-xs font-medium mb-1.5 text-slate-600">Mobile</label>
        <div className="flex gap-2 items-center">
          <Input 
            id="fld_mobile_qde" 
            className="flex-1 m-0" 
            value={lead.mobile}
            onChange={e => onFieldChange('mobile', e.target.value)}
          />
          <Button variant="ghost" onClick={() => onVerify('mobile', lead.mobile)} disabled={statuses.mobile === 'loading'}>
            {statuses.mobile === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
          </Button>
          <span>
            {statuses.mobile === 'verified' && <CheckCircle2 size={20} className="text-emerald-500" />}
            {statuses.mobile === 'failed' && <XCircle size={20} className="text-red-500" />}
            {statuses.mobile === 'idle' && <Circle size={20} className="text-slate-300" />}
          </span>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <label className="text-xs font-medium mb-1.5 text-slate-600">PAN</label>
        <div className="flex gap-2 items-center">
          <Input 
            id="fld_pan_qde" 
            className="flex-1 m-0"
            value={lead.pan}
            onChange={e => onFieldChange('pan', e.target.value.toUpperCase())}
          />
          <Button variant="ghost" onClick={() => onVerify('pan', lead.pan)} disabled={statuses.pan === 'loading'}>
            {statuses.pan === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
          </Button>
          <span>
            {statuses.pan === 'verified' && <CheckCircle2 size={20} className="text-emerald-500" />}
            {statuses.pan === 'failed' && <XCircle size={20} className="text-red-500" />}
            {statuses.pan === 'idle' && <Circle size={20} className="text-slate-300" />}
          </span>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <label className="text-xs font-medium mb-1.5 text-slate-600">Email</label>
        <div className="flex gap-2 items-center">
          <Input 
            id="fld_email_qde" 
            className="flex-1 m-0"
            value={lead.email}
            onChange={e => onFieldChange('email', e.target.value)}
          />
          <Button variant="ghost" onClick={() => onVerify('email', lead.email)} disabled={statuses.email === 'loading'}>
            {statuses.email === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
          </Button>
          <span>
            {statuses.email === 'verified' && <CheckCircle2 size={20} className="text-emerald-500" />}
            {statuses.email === 'failed' && <XCircle size={20} className="text-red-500" />}
            {statuses.email === 'idle' && <Circle size={20} className="text-slate-300" />}
          </span>
        </div>
      </div>
    </FormRow>
  );
}

const TabQDE = ({ lead, onFieldChange }) => {
  return (
    <div>
      <FormRow>
        <Input label="Applicant Name" id="fld_name" value={lead.name} onChange={e => onFieldChange('name', e.target.value)} />
        <Input label="Date of Birth" id="fld_dob" type="date" value={lead.dob} onChange={e => onFieldChange('dob', e.target.value)} />
        <Select label="Gender" id="fld_gender" value={lead.gender} onChange={e => onFieldChange('gender', e.target.value)}>
          <option value=""></option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </Select>
      </FormRow>
      <FormRow>
        <Input label="Aadhaar" id="fld_aadhaar" value={lead.aadhaar} onChange={e => onFieldChange('aadhaar', e.target.value)} />
        <Select label="Marital Status" id="fld_marital" value={lead.marital} onChange={e => onFieldChange('marital', e.target.value)}>
          <option value=""></option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
        </Select>
        <Select label="Education" id="fld_education" value={lead.education} onChange={e => onFieldChange('education', e.target.value)}>
          <option value=""></option>
          <option value="10th">10th</option>
          <option value="12th">12th</option>
          <option value="Graduate">Graduate</option>
          <option value="Postgraduate">Postgraduate</option>
        </Select>
      </FormRow>
      <FormRow>
        <Textarea label="Current Address" id="fld_addr_current" value={lead.addr_current} onChange={e => onFieldChange('addr_current', e.target.value)} />
        <Textarea label="Permanent Address" id="fld_addr_perm" value={lead.addr_perm} onChange={e => onFieldChange('addr_perm', e.target.value)} />
      </FormRow>
      <FormRow>
        <Select label="Employment Type" id="fld_employment" value={lead.employment} onChange={e => onFieldChange('employment', e.target.value)}>
          <option value=""></option>
          <option value="Salaried">Salaried</option>
          <option value="Self-Employed">Self-Employed</option>
          <option value="Business">Business</option>
        </Select>
        <Input label="Employer / Business" id="fld_employer" value={lead.employer} onChange={e => onFieldChange('employer', e.target.value)} />
        <Input label="Experience (yrs)" id="fld_experience" type="number" value={lead.experience} onChange={e => onFieldChange('experience', e.target.value)} />
      </FormRow>
      <FormRow>
        <Input label="Monthly Income (₹)" id="fld_income" type="number" value={lead.income} onChange={e => onFieldChange('income', e.target.value)} />
        <Input label="Requested Loan Amount (₹)" id="fld_requested" type="number" value={lead.requested} onChange={e => onFieldChange('requested', e.target.value)} />
        <Input label="Loan Purpose" id="fld_purpose" value={lead.purpose} onChange={e => onFieldChange('purpose', e.target.value)} />
      </FormRow>
    </div>
  );
}

const TabDDE = ({ lead, onFieldChange }) => {
  return (
    <div>
      <FormRow>
        <Input label="Bank Name" id="fld_bank" value={lead.bank} onChange={e => onFieldChange('bank', e.target.value)} />
        <Input label="Account Number" id="fld_account" value={lead.account} onChange={e => onFieldChange('account', e.target.value)} />
        <Input label="IFSC" id="fld_ifsc" value={lead.ifsc} onChange={e => onFieldChange('ifsc', e.target.value)} />
      </FormRow>
      <FormRow>
        <Select label="Salary Credit Method" id="fld_salary_method" value={lead.salary_method} onChange={e => onFieldChange('salary_method', e.target.value)}>
          <option>NEFT</option>
          <option>Cash</option>
          <option>Cheque</option>
        </Select>
        <Input label="Net Salary (₹)" id="fld_salary_net" type="number" value={lead.salary_net} onChange={e => onFieldChange('salary_net', e.target.value)} />
        <Select label="Existing Loans?" id="fld_existing_loans" value={lead.existing_loans} onChange={e => onFieldChange('existing_loans', e.target.value)}>
          <option>No</option>
          <option>Yes</option>
        </Select>
      </FormRow>
      <FormRow>
        <Input label="Total EMI (Existing) (₹)" id="fld_total_emi" type="number" value={lead.total_emi} onChange={e => onFieldChange('total_emi', e.target.value)} />
        <Input label="Credit Card Limit (₹)" id="fld_cc_limit" type="number" value={lead.cc_limit} onChange={e => onFieldChange('cc_limit', e.target.value)} />
        <Input label="GST (if business)" id="fld_gst" value={lead.gst} onChange={e => onFieldChange('gst', e.target.value)} />
      </FormRow>
    </div>
  );
}

const TabDocs = ({ lead, onDocsChange, onShowToast }) => {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('PAN');
  const fileInputRef = useRef(null);

  const handleUpload = () => {
    if (!file) {
      onShowToast('Please select a file to upload.', 'warning');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const newDoc = {
        id: uid(),
        name: file.name,
        type: docType,
        size: file.size,
        data: e.target.result.split(',')[1], // Store base64 data only
        uploadedAt: now(),
        status: 'Pending',
      };
      onDocsChange([...lead.documents, newDoc]);
      onShowToast(`Uploaded ${file.name}. Save lead to persist.`, 'success');
      setFile(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      onShowToast('Failed to read file.', 'error');
    };
    reader.readAsDataURL(file);
  };
  
  const removeDoc = (id) => {
    onDocsChange(lead.documents.filter(d => d.id !== id));
    onShowToast('Document removed from form. Save lead to persist.', 'success');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-end p-4 border rounded-lg bg-slate-50 mb-4">
        <Input 
          label="Document"
          id="docInput" 
          type="file"
          ref={fileInputRef}
          onChange={e => setFile(e.target.files[0])}
          className="m-0"
        />
        <Select 
          label="Document Type"
          id="docType" 
          value={docType}
          onChange={e => setDocType(e.target.value)}
          className="m-0"
        >
          <option>PAN</option>
          <option>Aadhaar</option>
          <option>Bank Statement</option>
          <option>Salary Slip</option>
          <option>ITR</option>
          <option>Other</option>
        </Select>
        <Button variant="ghost" onClick={handleUpload} className="h-10">
          <UploadCloud size={16} className="mr-2" /> Upload
        </Button>
      </div>
      <div className="text-sm">
        {lead.documents.length === 0 ? (
          <p className="text-slate-500">No documents uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {lead.documents.map(d => (
              <li key={d.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center">
                  <FileText size={18} className="text-slate-500 mr-3" />
                  <div>
                    <span className="font-medium text-slate-700">{safe(d.name)}</span>
                    <span className="text-xs text-white bg-slate-400 px-2 py-0.5 rounded-full ml-2">{safe(d.type)}</span>
                  </div>
                </div>
                <Button variant="danger" onClick={() => removeDoc(d.id)} className="p-1.5 h-auto">
                  <Trash2 size={16} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const TabFI = ({ lead, onFieldChange, onMarkFi }) => {
  return (
    <div>
      <FormRow>
        <Input label="Field Agent Code" id="fld_agent_code" value={lead.fieldAgent} onChange={e => onFieldChange('fieldAgent', e.target.value)} />
        <Select label="Residence Verified" id="fld_residence" value={lead.residenceVerified} onChange={e => onFieldChange('residenceVerified', e.target.value)}>
          <option>No</option>
          <option>Yes</option>
        </Select>
        <Select label="Business Verified" id="fld_business" value={lead.businessVerified} onChange={e => onFieldChange('businessVerified', e.target.value)}>
          <option>No</option>
          <option>Yes</option>
        </Select>
      </FormRow>
      <FormRow>
        <Input label="Geo Latitude" id="fld_lat" value={lead.lat} onChange={e => onFieldChange('lat', e.target.value)} />
        <Input label="Geo Longitude" id="fld_lng" value={lead.lng} onChange={e => onFieldChange('lng', e.target.value)} />
        <Input label="Customer Photo URL" id="fld_fi_photo" value={lead.fi_photo} onChange={e => onFieldChange('fi_photo', e.target.value)} />
      </FormRow>
      <FormRow>
        <Textarea label="Neighbour / Field Feedback" id="fld_neighbor_feedback" className="flex-1 1 100%" value={lead.neighbor_feedback} onChange={e => onFieldChange('neighbor_feedback', e.target.value)} />
      </FormRow>
      <div className="flex gap-2 mt-4">
        <Button variant="success" onClick={() => onMarkFi('Complete')}>Mark FI Complete</Button>
        <Button variant="danger" onClick={() => onMarkFi('Negative')}>Mark FI Negative</Button>
      </div>
    </div>
  );
}

const TabUW = ({ lead, onFieldChange, onRunAutoUW }) => {
  return (
    <div>
      <FormRow>
        <Input label="CIBIL Score" id="fld_cibil" type="number" value={lead.cibil} onChange={e => onFieldChange('cibil', e.target.value)} />
        <Input label="FOIR (%)" id="fld_foir" value={lead.foir} readOnly className="bg-slate-100" />
        <Input label="Risk Grade" id="fld_risk" value={lead.risk} readOnly className="bg-slate-100" />
      </FormRow>
      <FormRow>
        <Input label="Eligible Amount" id="fld_eligible" value={lead.eligible} readOnly className="bg-slate-100" />
        <Input label="Recommended Product" id="fld_reco_product" value={lead.reco_product} readOnly className="bg-slate-100" />
      </FormRow>
      <FormRow>
        <Textarea label="Underwriting Remarks" id="fld_uw_remarks" className="flex-1 1 100%" value={lead.uwRemarks} onChange={e => onFieldChange('uwRemarks', e.target.value)} />
      </FormRow>
      <div className="mt-4">
        <Button variant="ghost" onClick={onRunAutoUW}>Run Auto UW</Button>
      </div>
    </div>
  );
}

const TabSanction = ({ lead, onFieldChange, onCalculateEmi }) => {
  return (
    <div>
      <FormRow>
        <Input label="Sanctioned Amount" id="fld_san_amt" type="number" value={lead.sanctionAmt} onChange={e => onFieldChange('sanctionAmt', e.target.value)} />
        <Input label="ROI (%)" id="fld_san_roi" type="number" value={lead.sanctionROI} onChange={e => onFieldChange('sanctionROI', e.target.value)} />
        <Input label="Tenure (months)" id="fld_san_tenure" type="number" value={lead.sanctionTenure} onChange={e => onFieldChange('sanctionTenure', e.target.value)} />
      </FormRow>
      <FormRow>
        <Input label="Calculated EMI" id="fld_san_emi" value={lead.sanctionEMI} readOnly className="bg-slate-100" />
        <Input label="Sanction Remarks" id="fld_san_remarks" value={lead.sanctionRemarks} onChange={e => onFieldChange('sanctionRemarks', e.target.value)} />
      </FormRow>
      <div className="mt-4">
        <Button variant="primary" onClick={onCalculateEmi}>Calculate EMI</Button>
      </div>
    </div>
  );
}

const TabDisbursement = ({ lead, onFieldChange, onConfirmDisb }) => {
  return (
    <div>
      <FormRow>
        <Input label="Disbursed Amount" id="fld_disb_amt" type="number" value={lead.disbAmt} onChange={e => onFieldChange('disbAmt', e.target.value)} />
        <Input label="UTR" id="fld_utr" value={lead.utr} onChange={e => onFieldChange('utr', e.target.value)} />
        <Input label="Disbursement Date" id="fld_disb_date" type="date" value={lead.disbDate} onChange={e => onFieldChange('disbDate', e.target.value)} />
      </FormRow>
      <div className="mt-4">
        <Button variant="success" onClick={onConfirmDisb}>Confirm Disbursement</Button>
      </div>
    </div>
  );
}

const TabDeviations = ({ lead, onDeviationsChange }) => {
  const [name, setName] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');

  const handleAdd = () => {
    if (!name) return;
    const newDev = {
      id: uid(),
      name,
      expected,
      actual,
      status: expected === actual ? 'Closed' : 'Open',
      remarks: '',
    };
    onDeviationsChange([...lead.deviations, newDev]);
    setName('');
    setExpected('');
    setActual('');
  };
  
  const removeDev = (id) => {
    onDeviationsChange(lead.deviations.filter(d => d.id !== id));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 p-4 border rounded-lg bg-slate-50 mb-4 items-end">
        <Input label="Deviation Name" id="dev_name" placeholder="Deviation name" value={name} onChange={e => setName(e.target.value)} className="m-0" />
        <Input label="Expected" id="dev_expected" placeholder="Expected" value={expected} onChange={e => setExpected(e.target.value)} className="m-0" />
        <Input label="Actual" id="dev_actual" placeholder="Actual" value={actual} onChange={e => setActual(e.target.value)} className="m-0" />
        <Button variant="ghost" onClick={handleAdd} className="h-10">Add</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Expected</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Actual</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lead.deviations.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center text-slate-500">No deviations</td></tr>
            ) : (
              lead.deviations.map(d => (
                <tr key={d.id} className="border-b">
                  <td className="p-3 text-sm text-slate-700">{safe(d.name)}</td>
                  <td className="p-3 text-sm text-slate-700">{safe(d.expected)}</td>
                  <td className="p-3 text-sm text-slate-700">{safe(d.actual)}</td>
                  <td className="p-3 text-sm text-slate-700">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      d.status === 'Open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>{safe(d.status)}</span>
                  </td>
                  <td className="p-3">
                    <Button variant="danger" onClick={() => removeDev(d.id)} className="p-1.5 h-auto">
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- App Structure Components ---

const Sidebar = ({ currentStage, onSetStage, onOpenBre, onGlobalDedupe, onClearData, leads }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const counts = useMemo(() => {
    return leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
  }, [leads]);

  const navItems = STAGES.map(s => ({
    name: s,
    count: counts[s] || 0,
    icon: s === 'Home' ? Home : ChevronsRight,
  }));

  const NavItem = ({ item, isActive, onClick }) => (
    <li
      className={`flex justify-between items-center p-2.5 rounded-lg cursor-pointer mb-1.5 border-l-4 ${
        isActive
          ? 'bg-sky-500 text-white border-amber-400'
          : 'text-slate-300 border-transparent hover:bg-slate-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <item.icon size={18} className="mr-3" />
        <span className="text-sm font-medium">{item.name}</span>
      </div>
      <span className="text-xs bg-slate-700 rounded-full px-2 py-0.5">{item.count}</span>
    </li>
  );
  
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="text-xl font-bold text-center mb-4 text-white">Loan CRM · LOS</div>
      <nav className="flex-1">
        <ul className="list-none p-0 m-0">
          {navItems.map(item => (
            <NavItem
              key={item.name}
              item={item}
              isActive={currentStage === item.name}
              onClick={() => {
                onSetStage(item.name);
                setIsMobileOpen(false);
              }}
            />
          ))}
        </ul>
      </nav>
      <div className="mt-4 border-t border-slate-700 pt-4">
        <Button variant="ghost" className="w-full mb-2 bg-slate-700 text-white hover:bg-slate-600 border-slate-600" onClick={onGlobalDedupe}>
          <Users size={16} className="mr-2" /> Global Dedupe
        </Button>
        <Button variant="ghost" className="w-full mb-2 bg-slate-700 text-white hover:bg-slate-600 border-slate-600" onClick={onOpenBre}>
          <Settings size={16} className="mr-2" /> BRE Config
        </Button>
        <Button variant="ghost" className="w-full text-amber-400 hover:bg-amber-900 border-amber-800" onClick={onClearData}>
          <Trash2 size={16} className="mr-2" /> Clear Data
        </Button>
      </div>
      <div className="mt-4 text-xs text-slate-500">
        React + Tailwind Conversion
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-md"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu size={24} />
      </button>

      {/* Mobile Sidebar */}
      <div 
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity md:hidden ${
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileOpen(false)}
      >
        <aside 
          className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white p-4 overflow-auto transform transition-transform ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {sidebarContent}
        </aside>
      </div>
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-60 bg-slate-900 text-white p-4 fixed inset-y-0 left-0 overflow-auto">
        {sidebarContent}
      </aside>
    </>
  );
};

const Header = ({ onAddLead, onSaveForm, onExport, searchTerm, onSearch, pageTitle }) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
        <p className="text-sm text-slate-500">Loan Origination System Prototype (React Version)</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Input
            id="search"
            placeholder="Search name / mobile / PAN"
            className="min-w-[240px]"
            value={searchTerm}
            onChange={e => onSearch(e.target.value)}
          />
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <Button variant="primary" onClick={onAddLead} className="flex items-center">
          <Plus size={16} className="mr-1" /> Add Lead
        </Button>
        <Button variant="ghost" onClick={onSaveForm} title="Save open form" className="flex items-center">
          <Save size={16} className="mr-1" /> Save
        </Button>
        <Button variant="ghost" onClick={onExport} className="flex items-center">
          <Download size={16} className="mr-1" /> Export
        </Button>
      </div>
    </header>
  );
}

const StatsCards = ({ leads, onSetStage }) => {
  const stats = useMemo(() => {
    const show = ['New Lead', 'QDE', 'DDE', 'Underwriting', 'Sanctioned', 'Disbursed', 'Active', 'Rejected'];
    const counts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
    return show.map(s => ({ name: s, count: counts[s] || 0 }));
  }, [leads]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
      {stats.map(s => (
        <div
          key={s.name}
          className="bg-white p-4 rounded-lg shadow-md text-center cursor-pointer hover:shadow-lg hover:scale-105 transition-all"
          onClick={() => onSetStage(s.name)}
        >
          <h3 className="text-lg font-semibold text-slate-700">{s.count}</h3>
          <p className="text-xs text-slate-500">{s.name}</p>
        </div>
      ))}
    </div>
  );
};

const FiWidget = ({ leads, onAssign }) => {
  const [tasks, setTasks] = useState([]);
  
  const refreshTasks = useCallback(() => {
    setTasks(leads.filter(l => l.status === 'FI' && !l.fieldAgent));
  }, [leads]);
  
  useEffect(() => {
    refreshTasks();
  }, [leads, refreshTasks]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">Field Investigation Tasks</h3>
          <p className="text-sm text-slate-500">Leads in FI stage pending assignment</p>
        </div>
        <Button variant="ghost" onClick={refreshTasks}>Refresh</Button>
      </div>
      <div className="max-h-60 overflow-auto">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No FI tasks</p>
        ) : (
          tasks.map(t => (
            <div key={t.id} className="flex justify-between items-center p-3 border rounded-lg mb-2">
              <div>
                <strong className="text-sm text-slate-700">{safe(t.name)}</strong>
                <p className="text-xs text-slate-500">Mobile: {safe(t.mobile)}</p>
              </div>
              <Button variant="primary" onClick={() => onAssign(t.id)}>Assign</Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const LeadsTable = ({ leads, onEdit, onView, onMoveNext, onMoveBack, onDelete }) => {
  
  const getNext = (stage) => {
    const i = STAGES.indexOf(stage);
    return (i >= 0 && i < STAGES.length - 1) ? STAGES[i + 1] : null;
  };
  const getPrev = (stage) => {
    const i = STAGES.indexOf(stage);
    return (i > 1) ? STAGES[i - 1] : null; // Cannot go back to 'Home'
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Mobile</th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Stage</th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Decision</th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center p-6 text-slate-500">No leads found</td>
            </tr>
          ) : (
            leads.map(r => {
              const nextStage = getNext(r.status);
              const prevStage = getPrev(r.status);
              return (
                <tr key={r.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 text-sm text-slate-700">{safe(r.name)}</td>
                  <td className="p-3 text-sm text-slate-700">{safe(r.mobile)}</td>
                  <td className="p-3 text-sm text-slate-700">{safe(r.product || 'N/A')}</td>
                  <td className="p-3 text-sm text-slate-700">
                    <span className="bg-slate-200 text-slate-700 text-xs font-medium px-2 py-1 rounded-full">{safe(r.status)}</span>
                  </td>
                  <td className="p-3 text-sm text-slate-700">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      r.decision === 'Approve' ? 'bg-emerald-100 text-emerald-700' :
                      r.decision === 'Reject' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{safe(r.decision || 'N/A')}</span>
                  </td>
                  <td className="p-3 text-sm text-slate-700 flex flex-wrap gap-1.5">
                    <Button variant="ghost" onClick={() => onView(r.id)} title="View" className="p-1.5">
                      <Eye size={16} />
                    </Button>
                    <Button variant="ghost" onClick={() => onEdit(r.id)} title="Edit" className="p-1.5">
                      <Edit size={16} />
                    </Button>
                    {nextStage && (
                      <Button variant="success" onClick={() => onMoveNext(r.id, nextStage)} title={`Move to ${nextStage}`} className="p-1.5">
                        <ChevronRight size={16} />
                      </Button>
                    )}
                    {prevStage && (
                      <Button variant="warning" onClick={() => onMoveBack(r.id, prevStage)} title={`Send back to ${prevStage}`} className="p-1.5">
                        <ChevronLeft size={16} />
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => onDelete(r.id)} title="Delete" className="p-1.5">
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

const LeadForm = ({ 
  editingLead, 
  onSave, 
  onCancel, 
  onRunBre, 
  onCompare, 
  onShowToast, 
  breConfig 
}) => {
  const [lead, setLead] = useState(editingLead || newLeadTemplate);
  const [activeTab, setActiveTab] = useState('qde');
  const [verificationStatuses, setVerificationStatuses] = useState({
    mobile: 'idle',
    pan: 'idle',
    email: 'idle',
  });

  useEffect(() => {
    const newLead = editingLead || newLeadTemplate;
    setLead(newLead);
    setVerificationStatuses({
      mobile: newLead.mobileVerified ? 'verified' : 'idle',
      pan: newLead.panVerified ? 'verified' : 'idle',
      email: newLead.emailVerified ? 'verified' : 'idle',
    });
    setActiveTab('qde');
  }, [editingLead]);

  const handleFieldChange = useCallback((field, value) => {
    setLead(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveClick = () => {
    if (!lead.name) {
      onShowToast('Name is required.', 'error');
      return;
    }
    if (!/^\d{10}$/.test(lead.mobile)) {
      onShowToast('Valid 10-digit mobile is required.', 'error');
      return;
    }
    
    const breRes = runBRELogic(lead, breConfig);
    const finalLead = {
      ...lead,
      decision: breRes.decision,
      risk: breRes.risk,
      foir: breRes.foir,
      mobileVerified: verificationStatuses.mobile === 'verified',
      panVerified: verificationStatuses.pan === 'verified',
      emailVerified: verificationStatuses.email === 'verified',
    };
    
    onSave(finalLead, breRes);
  };

  const handleVerify = async (type, value) => {
    setVerificationStatuses(prev => ({ ...prev, [type]: 'loading' }));
    let isValid = false;
    let errorMsg = 'Invalid input.';

    try {
      await new Promise(r => setTimeout(r, 700));
      if (type === 'mobile') {
        if (!/^\d{10}$/.test(value)) {
          errorMsg = 'Enter a valid 10-digit mobile number.';
        } else {
          isValid = parseInt(value.slice(-1)) % 2 === 0;
          errorMsg = 'Mobile verification failed (simulated).';
        }
      } else if (type === 'pan') {
        if (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(value)) {
          errorMsg = 'Enter a valid PAN (e.g., AAAAA9999A).';
        } else {
          isValid = value[3] && value[3].toUpperCase() !== 'Z';
          errorMsg = 'PAN verification failed (simulated).';
        }
      } else if (type === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errorMsg = 'Enter a valid email address.';
        } else {
          isValid = !value.endsWith('@example.com');
          errorMsg = 'Email verification failed (simulated).';
        }
      }
    } catch (e) {
      isValid = false;
      errorMsg = 'Verification service failed.';
    }
    
    if (isValid) {
      setVerificationStatuses(prev => ({ ...prev, [type]: 'verified' }));
      onShowToast(`${type.charAt(0).toUpperCase() + type.slice(1)} verified.`, 'success');
    } else {
      setVerificationStatuses(prev => ({ ...prev, [type]: 'failed' }));
      onShowToast(errorMsg, 'error');
    }
  };
  
  const handleRunAutoUW = () => {
    const res = runBRELogic(lead, breConfig);
    setLead(prev => ({
      ...prev,
      foir: res.foir,
      risk: res.risk,
      eligible: Math.floor(Number(prev.income || 0) * 0.5),
      reco_product: 'AutoReco-PL',
      uwRemarks: res.reasons.join('; ') || 'Auto UW passed',
    }));
    onShowToast('Auto UW: ' + res.decision, 'success');
  };
  
  const handleCalculateEmi = () => {
    const emi = calcEMI(lead.sanctionAmt, lead.sanctionROI, lead.sanctionTenure);
    if (emi === 0) {
      onShowToast('Please enter Sanction Amount, ROI, and Tenure.', 'warning');
      return;
    }
    setLead(prev => ({ ...prev, sanctionEMI: emi }));
    onShowToast('EMI Calculated: ₹' + emi, 'success');
  };
  
  const handleConfirmDisb = () => {
    if (!lead.disbAmt || !lead.utr || !lead.disbDate) {
      onShowToast('Please fill Disbursed Amount, UTR, and Date.', 'warning');
      return;
    }
    const finalLead = { ...lead, status: 'Disbursed' };
    onSave(finalLead, null, 'Disbursed');
  };
  
  const handleMarkFi = (status) => {
    const finalLead = { ...lead, status: status === 'Complete' ? 'Underwriting' : 'Rejected' };
    onSave(finalLead, null, `FI Marked as ${status}`);
  };

  const tabsContent = {
    qde: <TabQDE lead={lead} onFieldChange={handleFieldChange} />,
    dde: <TabDDE lead={lead} onFieldChange={handleFieldChange} />,
    docs: <TabDocs lead={lead} onDocsChange={(docs) => handleFieldChange('documents', docs)} onShowToast={onShowToast} />,
    fi: <TabFI lead={lead} onFieldChange={handleFieldChange} onMarkFi={handleMarkFi} />,
    uw: <TabUW lead={lead} onFieldChange={handleFieldChange} onRunAutoUW={handleRunAutoUW} />,
    san: <TabSanction lead={lead} onFieldChange={handleFieldChange} onCalculateEmi={handleCalculateEmi} />,
    disb: <TabDisbursement lead={lead} onFieldChange={handleFieldChange} onConfirmDisb={handleConfirmDisb} />,
    dev: <TabDeviations lead={lead} onDeviationsChange={(devs) => handleFieldChange('deviations', devs)} />,
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 pb-4 border-b gap-3">
        <div>
          <h3 className="text-xl font-semibold text-sky-600">Application</h3>
          <p className="text-sm text-slate-500">Stage-aware form (QDE, DDE, FI, UW, etc.)</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select 
            label="Stage" 
            id="stageSelect"
            className="m-0"
            value={lead.status}
            onChange={e => handleFieldChange('status', e.target.value)}
          >
            {STAGES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Button variant="ghost" onClick={() => onRunBre(lead)}>Run BRE</Button>
          <Button variant="ghost" onClick={() => onCompare(lead)}>QDE ↔ DDE</Button>
          <Button id="formSaveButton" variant="primary" onClick={handleSaveClick}>Save Lead</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
      
      <VerificationBar 
        lead={lead} 
        onFieldChange={handleFieldChange} 
        onVerify={handleVerify} 
        statuses={verificationStatuses} 
      />
      
      <div className="flex flex-wrap gap-1 border-b mb-4">
        {TAB_OPTIONS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2.5 px-4 text-sm font-medium rounded-t-lg border-b-2
                ${activeTab === tab.id 
                  ? 'border-sky-500 text-sky-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              <Icon size={16} className="mr-2" />
              {tab.label}
            </button>
          )
        })}
      </div>
      
      <div className="py-4">
        {tabsContent[activeTab]}
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [appState, setAppState] = useState(loadState());
  const [currentStage, setCurrentStage] = useState('Home');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  
  const [toast, setToast] = useState({ message: '', type: 'success', key: 0 });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  
  const [activeModal, setActiveModal] = useState(null); // 'bre', 'view', 'dedupe', 'globalDedupe', 'fiAssign'
  const [modalData, setModalData] = useState(null); // Stores data for the modal, e.g., lead to view
  
  const { leads, bre } = appState;

  // --- State Persistence ---
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(appState));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }, [appState]);

  // --- Toast Handler ---
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  // --- Data Handlers ---
  const handleSaveLead = useCallback((lead, breRes, customAuditMsg = '') => {
    setAppState(prev => {
      const newLeads = [...prev.leads];
      let auditMsg = '';
      
      if (customAuditMsg) {
        auditMsg = customAuditMsg;
      } else if (lead.id) {
        auditMsg = `Updated lead at ${lead.status}.`;
      } else {
        auditMsg = `Created lead at ${lead.status}.`;
      }
      
      if (breRes) {
        auditMsg += ` BRE:${breRes.decision}. ${breRes.reasons.join('; ')}`;
      }

      const newAudit = { ts: now(), msg: auditMsg };
      
      if (lead.id) {
        // Update
        const index = newLeads.findIndex(l => l.id === lead.id);
        if (index !== -1) {
          const updatedLead = {
            ...lead,
            updatedAt: now(),
            audit: [...(lead.audit || []), newAudit],
          };
          newLeads[index] = updatedLead;
          showToast('Lead updated successfully!', 'success');
        }
      } else {
        // Create
        const newLead = {
          ...lead,
          id: uid(),
          createdAt: now(),
          updatedAt: now(),
          audit: [newAudit],
        };
        newLeads.push(newLead);
        showToast('Lead created successfully!', 'success');
      }
      
      setIsFormOpen(false);
      setEditingLead(null);
      return { ...prev, leads: newLeads };
    });
  }, [showToast]);

  const handleDeleteLead = useCallback((id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead? This action cannot be undone.',
      onConfirm: () => {
        setAppState(prev => ({
          ...prev,
          leads: prev.leads.filter(l => l.id !== id),
        }));
        showToast('Lead deleted.', 'success');
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  }, [showToast]);

  const handleClearData = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear All Data',
      message: 'Are you sure you want to clear ALL application data? This is permanent.',
      onConfirm: () => {
        setAppState({ leads: [], bre: DEFAULT_BRE });
        showToast('All data cleared.', 'success');
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  }, [showToast]);

  const handleSaveBre = useCallback((newBre) => {
    setAppState(prev => ({ ...prev, bre: newBre }));
    showToast('BRE configuration saved.', 'success');
    setActiveModal(null);
  }, [showToast]);

  const handleStageChange = (id, newStage, auditMsg) => {
    setAppState(prev => {
      const newLeads = prev.leads.map(l => {
        if (l.id === id) {
          return {
            ...l,
            status: newStage,
            updatedAt: now(),
            audit: [...(l.audit || []), { ts: now(), msg: auditMsg }]
          };
        }
        return l;
      });
      return { ...prev, leads: newLeads };
    });
    showToast(`Lead moved to ${newStage}`, 'success');
  };

  const handleMoveNext = useCallback((id, nextStage) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    if (nextStage === 'Underwriting' && (!lead.bank || !lead.account || !lead.ifsc)) {
      setAppState(prev => ({
        ...prev,
        leads: prev.leads.map(l => l.id === id ? {
          ...l,
          deviations: [...(l.deviations || []), { id: uid(), name: 'Missing DDE', expected: 'Bank/Account/IFSC', actual: 'Missing', status: 'Open', remarks: 'Blocked' }],
          audit: [...(l.audit || []), { ts: now(), msg: 'Blocked to UW: missing DDE' }]
        } : l)
      }));
      showToast('DDE missing — deviation created', 'warning');
      return;
    }
    
    handleStageChange(id, nextStage, `Moved to ${nextStage}`);
  }, [leads, showToast]);
  
  const handleMoveBack = useCallback((id, prevStage) => {
    handleStageChange(id, prevStage, `Sent back to ${prevStage}`);
  }, []);

  const handleAssignFi = useCallback((agentName) => {
    if (!agentName || !modalData) {
      showToast('Agent name required.', 'error');
      return;
    }
    const leadId = modalData;
    setAppState(prev => ({
      ...prev,
      leads: prev.leads.map(l => l.id === leadId ? {
        ...l,
        fieldAgent: agentName,
        audit: [...(l.audit || []), { ts: now(), msg: `Assigned FI agent: ${agentName}` }]
      } : l)
    }));
    showToast('Agent assigned', 'success');
    setActiveModal(null);
    setModalData(null);
  }, [modalData, showToast]);

  // --- UI Handlers ---
  
  const handleOpenForm = (lead = null) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };
  
  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingLead(null);
  };
  
  const handleSaveFormButton = () => {
    if (isFormOpen) {
      // Programmatically click the form's internal save button
      const saveButton = document.getElementById('formSaveButton'); 
      if (saveButton) {
        saveButton.click();
      } else {
        showToast('Please use the "Save Lead" button inside the form.', 'warning');
      }
    } else {
      showToast('Open a lead to save.', 'warning');
    }
  };

  const handleExport = useCallback(() => {
    if (!leads || leads.length === 0) {
      showToast('No leads to export.', 'warning');
      return;
    }
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
    showToast('Leads exported.', 'success');
  }, [leads, showToast]);

  const handleRunBre = useCallback((lead) => {
    const res = runBRELogic(lead, bre);
    showToast(`BRE Result: ${res.decision}. ${res.reasons.join('; ')}`, 'success');
  }, [bre, showToast]);
  
  const handleCompare = (lead) => {
    setModalData(lead);
    setActiveModal('dedupe');
  };
  
  const handleViewLead = (id) => {
    const lead = leads.find(l => l.id === id);
    if (lead) {
      setModalData(lead);
      setActiveModal('view');
    }
  };

  // --- Derived State ---
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

  const pageTitle = currentStage === 'Home' ? 'Dashboard' : currentStage;

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <Toast 
        key={toast.key} 
        message={toast.message} 
        type={toast.type} 
        onDismiss={() => setToast({ message: '', type: 'success', key: 0 })} 
      />
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
      
      {activeModal === 'bre' && (
        <BreConfigModal 
          bre={bre} 
          onSave={handleSaveBre}
          onClose={() => setActiveModal(null)} 
        />
      )}
      {activeModal === 'view' && (
        <ViewModal 
          lead={modalData}
          onClose={() => { setActiveModal(null); setModalData(null); }}
        />
      )}
      {activeModal === 'dedupe' && (
        <DedupeModal
          lead={modalData}
          onClose={() => { setActiveModal(null); setModalData(null); }}
        />
      )}
      {activeModal === 'globalDedupe' && (
        <GlobalDedupeModal
          leads={leads}
          onClose={() => setActiveModal(null)}
          onView={(id) => {
            setActiveModal(null); // Close this modal
            handleViewLead(id); // Open the view modal
          }}
        />
      )}
      {activeModal === 'fiAssign' && (
        <FiAssignModal
          onClose={() => { setActiveModal(null); setModalData(null); }}
          onAssign={handleAssignFi}
        />
      )}
      
      <Sidebar
        currentStage={currentStage}
        onSetStage={setCurrentStage}
        onOpenBre={() => setActiveModal('bre')}
        onGlobalDedupe={() => setActiveModal('globalDedupe')}
        onClearData={handleClearData}
        leads={leads}
      />
      
      <main className="flex-1 md:ml-60 p-4 md:p-6">
        <Header
          pageTitle={pageTitle}
          onAddLead={() => handleOpenForm(null)}
          onSaveForm={handleSaveFormButton}
          onExport={handleExport}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
        />
        
        {currentStage === 'Home' && (
          <>
            <StatsCards leads={leads} onSetStage={setCurrentStage} />
            <FiWidget 
              leads={leads} 
              onAssign={(id) => {
                setModalData(id);
                setActiveModal('fiAssign');
              }}
            />
          </>
        )}
        
        {isFormOpen && (
          <LeadForm
            key={editingLead ? editingLead.id : 'new'}
            editingLead={editingLead}
            onSave={handleSaveLead}
            onCancel={handleCancelForm}
            onRunBre={handleRunBre}
            onCompare={handleCompare}
            onShowToast={showToast}
            breConfig={bre}
          />
        )}
        
        {!isFormOpen && (
          <LeadsTable
            leads={filteredLeads}
            onEdit={(id) => handleOpenForm(leads.find(l => l.id === id))}
            onView={handleViewLead}
            onMoveNext={handleMoveNext}
            onMoveBack={handleMoveBack}
            onDelete={handleDeleteLead}
          />
        )}
        
        <footer className="text-center text-sm text-slate-500 mt-6">
          Data stored in localStorage key: <strong>{KEY}</strong>
        </footer>
      </main>
    </div>
  );
}
