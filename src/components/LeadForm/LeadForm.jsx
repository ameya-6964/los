import React, { useState, useEffect, useRef } from 'react';
import { STAGES, TABS, newLeadTemplate } from '../../constants';
import { toast, uid, safe, calcEMI, runBRELogic } from '../../utils';
import FormGroup from './FormGroup';

export default function LeadForm({
  initialLead,
  onSave,
  onCancel,
  breConfig,
  onRunDedupe,
}) {
  const [formLead, setFormLead] = useState(newLeadTemplate);
  const [currentDocs, setCurrentDocs] = useState([]);
  const [currentDeviations, setCurrentDeviations] = useState([]);
  const [activeTab, setActiveTab] = useState('qde');
  const [verificationStatus, setVerificationStatus] = useState({ mobile: '⚪', pan: '⚪', email: '⚪' });

  // Refs for uncontrolled inputs
  const docInputRef = useRef();
  const devNameRef = useRef();
  const devExpectedRef = useRef();
  const devActualRef = useRef();

  // Load initial data when component mounts or initialLead changes
  useEffect(() => {
    if (initialLead) {
      setFormLead(initialLead);
      setCurrentDocs(initialLead.documents || []);
      setCurrentDeviations(initialLead.deviations || []);
      setVerificationStatus({
        mobile: initialLead.mobileVerified ? '✅' : '⚪',
        pan: initialLead.panVerified ? '✅' : '⚪',
        email: initialLead.emailVerified ? '✅' : '⚪',
      });
      setActiveTab('qde');
    }
  }, [initialLead]);

  const handleFormFieldChange = (field, value) => {
    setFormLead(prev => ({ ...prev, [field]: value }));
  };

  const handleVerify = async (type) => {
    let value, field;
    if (type === 'mobile') {
      value = formLead.mobile;
      field = 'mobile';
      if (!/^\d{10}$/.test(value)) return toast('Enter valid 10-digit mobile');
    } else if (type === 'pan') {
      value = formLead.pan;
      field = 'pan';
      if (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(value)) return toast('Enter PAN e.g. AAAAA9999A');
    } else { // email
      value = formLead.email;
      field = 'email';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return toast('Enter valid email');
    }
    
    setVerificationStatus(prev => ({ ...prev, [field]: '⏳' }));
    await new Promise(r => setTimeout(r, 700)); // Simulate API call
    
    let result = '❌';
    if (type === 'mobile') result = (parseInt(value.slice(-1)) % 2 === 0) ? '✅' : '❌';
    else if (type === 'pan') result = value[3] && value[3].toUpperCase() !== 'Z' ? '✅' : '❌';
    else if (type === 'email') result = !value.endsWith('@example.com') ? '✅' : '❌';
    
    setVerificationStatus(prev => ({ ...prev, [field]: result }));
    toast(`${field} verification simulated`);
  };

  const handleDocUpload = () => {
    const f = docInputRef.current.files && docInputRef.current.files[0];
    if (!f) return toast('Select a file');
    
    const reader = new FileReader();
    reader.onload = function (e) {
      const newDoc = {
        id: uid(),
        name: f.name,
        type: document.getElementById('docType').value || f.type,
        size: f.size,
        data: e.target.result,
        uploadedAt: new Date().toISOString(),
        status: 'Pending'
      };
      setCurrentDocs(prev => [...prev, newDoc]);
      toast('Uploaded to form (Save Lead to persist)');
    };
    reader.readAsDataURL(f);
  };
  
  const handleAddDeviation = () => {
    const n = (devNameRef.current.value || '').trim();
    const ex = (devExpectedRef.current.value || '').trim();
    const ac = (devActualRef.current.value || '').trim();
    if (!n) return toast('Deviation name required');
    
    setCurrentDeviations(prev => [...prev, {
      id: uid(), name: n, expected: ex, actual: ac, status: ex === ac ? 'Closed' : 'Open', remarks: ''
    }]);
    
    devNameRef.current.value = '';
    devExpectedRef.current.value = '';
    devActualRef.current.value = '';
  };

  const handleAutoUW = () => {
    const res = runBRELogic(formLead, breConfig);
    setFormLead(prev => ({
      ...prev,
      foir: res.foir,
      risk: res.risk,
      eligible: Math.floor((Number(prev.income || 0) * 0.5)),
      reco_product: 'AutoReco',
      uwRemarks: res.reasons.join('; ') || 'Auto UW done'
    }));
    toast('Auto UW: ' + res.decision);
  };
  
  const handleCalculateEMI = () => {
    const { sanctionAmt, sanctionROI, sanctionTenure } = formLead;
    if (!sanctionAmt || !sanctionROI || !sanctionTenure) return toast('Sanction amount/ROI/tenure required');
    const emi = calcEMI(sanctionAmt, sanctionROI, sanctionTenure);
    setFormLead(prev => ({ ...prev, sanctionEMI: emi }));
    toast('EMI calculated');
  };

  const handleRunBreToast = () => {
    const res = runBRELogic(formLead, breConfig);
    toast(`BRE Run: ${res.decision}. Reasons: ${res.reasons.join(', ')}`);
  };

  const onSaveClick = () => {
    const finalLead = {
      ...formLead,
      documents: currentDocs,
      deviations: currentDeviations,
      mobileVerified: verificationStatus.mobile === '✅',
      panVerified: verificationStatus.pan === '✅',
      emailVerified: verificationStatus.email === '✅',
    };
    onSave(finalLead);
  };
  
  // These pass the save event up with a specific status
  const onConfirmDisb = () => {
    const { disbAmt, utr, disbDate } = formLead;
    if (!disbAmt || !utr || !disbDate) return toast('Amount, UTR, and Date required');
    onSave({ ...formLead, status: 'Disbursed' }, `Disbursed ${disbAmt} UTR:${utr}`);
  };

  const onMarkFI = (isComplete) => {
    const newStatus = isComplete ? 'Underwriting' : 'Rejected';
    const auditMsg = `FI Marked as ${isComplete ? 'Complete' : 'Negative'}. Moved to ${newStatus}`;
    onSave({ ...formLead, status: newStatus }, auditMsg);
  };

  return (
    <div className="panel">
      {/* Form Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--primary)' }}>Application</h3>
          <div className="small">Stage-aware form (QDE, DDE, Documents, FI, UW, Sanction, Disbursement, Deviations)</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label className="small">Stage</label>
          <select 
            className="input" 
            value={formLead.status} 
            onChange={e => handleFormFieldChange('status', e.target.value)}
          >
            {STAGES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn ghost" onClick={handleRunBreToast}>Run BRE</button>
          <button className="btn ghost" onClick={() => onRunDedupe(formLead)}>QDE ↔ DDE</button>
          <button id="lead-form-save-button" className="btn primary" onClick={onSaveClick}>Save Lead</button>
          <button className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>

      {/* Verification Bar */}
      <div className="row" style={{ alignItems: 'center', marginBottom: '6px' }}>
        <FormGroup label="Mobile" style={{ minWidth: '200px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input value={formLead.mobile} onChange={e => handleFormFieldChange('mobile', e.target.value)} />
            <button className="btn ghost" onClick={() => handleVerify('mobile')}>Verify</button>
            <span>{verificationStatus.mobile}</span>
          </div>
        </FormGroup>
        <FormGroup label="PAN" style={{ minWidth: '200px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input value={formLead.pan} onChange={e => handleFormFieldChange('pan', e.target.value.toUpperCase())} />
            <button className="btn ghost" onClick={() => handleVerify('pan')}>Verify</button>
            <span>{verificationStatus.pan}</span>
          </div>
        </FormGroup>
        <FormGroup label="Email" style={{ minWidth: '220px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input value={formLead.email} onChange={e => handleFormFieldChange('email', e.target.value)} />
            <button className="btn ghost" onClick={() => handleVerify('email')}>Verify</button>
            <span>{verificationStatus.email}</span>
          </div>
        </FormGroup>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(tab => (
          <div 
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`} 
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* --- QDE Module --- */}
      <div style={{ display: activeTab === 'qde' ? 'block' : 'none' }}>
        <div className="row">
          <FormGroup label="Applicant Name"><input value={formLead.name} onChange={e => handleFormFieldChange('name', e.target.value)} /></FormGroup>
          <FormGroup label="Date of Birth"><input type="date" value={formLead.dob} onChange={e => handleFormFieldChange('dob', e.target.value)} /></FormGroup>
          <FormGroup label="Gender"><select value={formLead.gender} onChange={e => handleFormFieldChange('gender', e.target.value)}><option></option><option>Male</option><option>Female</option><option>Other</option></select></FormGroup>
        </div>
        <div className="row">
          <FormGroup label="Aadhaar"><input value={formLead.aadhaar} onChange={e => handleFormFieldChange('aadhaar', e.target.value)} /></FormGroup>
          <FormGroup label="Marital Status"><select value={formLead.marital} onChange={e => handleFormFieldChange('marital', e.target.value)}><option></option><option>Single</option><option>Married</option></select></FormGroup>
          <FormGroup label="Education"><select value={formLead.education} onChange={e => handleFormFieldChange('education', e.target.value)}><option></option><option>10th</option><option>12th</option><option>Graduate</option><option>Postgraduate</option></select></FormGroup>
        </div>
        <div className="row">
          <FormGroup label="Current Address"><textarea value={formLead.addr_current} onChange={e => handleFormFieldChange('addr_current', e.target.value)}></textarea></FormGroup>
          <FormGroup label="Permanent Address"><textarea value={formLead.addr_perm} onChange={e => handleFormFieldChange('addr_perm', e.target.value)}></textarea></FormGroup>
        </div>
        <div className="row">
          <FormGroup label="Employment Type"><select value={formLead.employment} onChange={e => handleFormFieldChange('employment', e.target.value)}><option></option><option>Salaried</option><option>Self-Employed</option><option>Business</option></select></FormGroup>
          <FormGroup label="Employer / Business"><input value={formLead.employer} onChange={e => handleFormFieldChange('employer', e.target.value)} /></FormGroup>
          <FormGroup label="Experience (yrs)"><input type="number" value={formLead.experience} onChange={e => handleFormFieldChange('experience', e.target.value)} /></FormGroup>
        </div>
        <div className="row">
          <FormGroup label="Monthly Income (₹)"><input type="number" value={formLead.income} onChange={e => handleFormFieldChange('income', e.target.value)} /></FormGroup>
          <FormGroup label="Requested Loan Amount (₹)"><input type="number" value={formLead.requested} onChange={e => handleFormFieldChange('requested', e.target.value)} /></FormGroup>
          <FormGroup label="Loan Purpose"><input value={formLead.purpose} onChange={e => handleFormFieldChange('purpose', e.target.value)} /></FormGroup>
        </div>
      </div>

      {/* --- DDE Module --- */}
      <div style={{ display: activeTab === 'dde' ? 'block' : 'none' }}>
          <div className="row">
            <FormGroup label="Bank Name"><input value={formLead.bank} onChange={e => handleFormFieldChange('bank', e.target.value)} /></FormGroup>
            <FormGroup label="Account Number"><input value={formLead.account} onChange={e => handleFormFieldChange('account', e.target.value)} /></FormGroup>
            <FormGroup label="IFSC"><input value={formLead.ifsc} onChange={e => handleFormFieldChange('ifsc', e.target.value)} /></FormGroup>
          </div>
          <div className="row">
            <FormGroup label="Salary Credit Method"><select value={formLead.salary_method} onChange={e => handleFormFieldChange('salary_method', e.target.value)}><option>NEFT</option><option>Cash</option><option>Cheque</option></select></FormGroup>
            <FormGroup label="Net Salary (₹)"><input type="number" value={formLead.salary_net} onChange={e => handleFormFieldChange('salary_net', e.target.value)} /></FormGroup>
            <FormGroup label="Existing Loans?"><select value={formLead.existing_loans} onChange={e => handleFormFieldChange('existing_loans', e.target.value)}><option>No</option><option>Yes</option></select></FormGroup>
          </div>
          <div className="row">
            <FormGroup label="Total EMI (Existing) (₹)"><input type="number" value={formLead.total_emi} onChange={e => handleFormFieldChange('total_emi', e.target.value)} /></FormGroup>
            <FormGroup label="Credit Card Limit (₹)"><input type="number" value={formLead.cc_limit} onChange={e => handleFormFieldChange('cc_limit', e.target.value)} /></FormGroup>
            <FormGroup label="GST (if business)"><input value={formLead.gst} onChange={e => handleFormFieldChange('gst', e.target.value)} /></FormGroup>
          </div>
          <div style={{ marginTop: '8px' }}>
            <button className="btn ghost" onClick={() => onRunDedupe(formLead)}>Compare QDE↔DDE</button>
          </div>
      </div>
      
      {/* --- Docs Module --- */}
      <div style={{ display: activeTab === 'docs' ? 'block' : 'none' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <input type="file" ref={docInputRef} />
          <select id="docType"><option>PAN</option><option>Aadhaar</option><option>Bank Statement</option><option>Salary Slip</option><option>ITR</option><option>Other</option></select>
          <button className="btn ghost" onClick={handleDocUpload}>Upload</button>
        </div>
        <div className="small">
          {currentDocs.length === 0 ? 'No documents' : (
            currentDocs.map(d => <div key={d.id} style={{ marginBottom: '6px' }}>{safe(d.name)} — <small>{safe(d.type)}</small></div>)
          )}
        </div>
      </div>

      {/* --- FI Module --- */}
      <div style={{ display: activeTab === 'fi' ? 'block' : 'none' }}>
        <div className="row">
          <FormGroup label="Field Agent Code"><input value={formLead.fieldAgent} onChange={e => handleFormFieldChange('fieldAgent', e.target.value)} /></FormGroup>
          <FormGroup label="Residence Verified"><select value={formLead.residenceVerified} onChange={e => handleFormFieldChange('residenceVerified', e.target.value)}><option>No</option><option>Yes</option></select></FormGroup>
          <FormGroup label="Business Verified"><select value={formLead.businessVerified} onChange={e => handleFormFieldChange('businessVerified', e.target.value)}><option>No</option><option>Yes</option></select></FormGroup>
        </div>
        <div className="row">
          <FormGroup label="Geo Latitude"><input value={formLead.lat} onChange={e => handleFormFieldChange('lat', e.target.value)} /></FormGroup>
          <FormGroup label="Geo Longitude"><input value={formLead.lng} onChange={e => handleFormFieldChange('lng', e.target.value)} /></FormGroup>
          <FormGroup label="Customer Photo"><input value={formLead.fi_photo} onChange={e => handleFormFieldChange('fi_photo', e.target.value)} /></FormGroup>
        </div>
        <div className="row">
          <FormGroup label="Neighbour / Field Feedback" style={{ flex: '1 1 100%' }}><textarea value={formLead.neighbor_feedback} onChange={e => handleFormFieldChange('neighbor_feedback', e.target.value)}></textarea></FormGroup>
        </div>
        <div style={{ marginTop: '8px' }}>
          <button className="btn primary" onClick={() => onMarkFI(true)}>Mark FI Complete</button>
          <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => onMarkFI(false)}>Mark FI Negative</button>
        </div>
      </div>

      {/* --- UW Module --- */}
      <div style={{ display: activeTab === 'uw' ? 'block' : 'none' }}>
        <div className="row">
          <FormGroup label="CIBIL Score"><input type="number" value={formLead.cibil} onChange={e => handleFormFieldChange('cibil', e.target.value)} /></FormGroup>
          <FormGroup label="FOIR (%)"><input value={formLead.foir} readOnly /></FormGroup>
          <FormGroup label="Risk Grade"><input value={formLead.risk} readOnly /></FormGroup>
        </div>
        <div className="row">
          <FormGroup label="Eligible Amount"><input value={formLead.eligible} readOnly /></FormGroup>
          <FormGroup label="Recommended Product"><input value={formLead.reco_product} readOnly /></FormGroup>
          <FormGroup label="Underwriting Remarks"><textarea value={formLead.uwRemarks} onChange={e => handleFormFieldChange('uwRemarks', e.target.value)}></textarea></FormGroup>
        </div>
        <div style={{ marginTop: '8px' }}><button className="btn ghost" onClick={handleAutoUW}>Run Auto UW</button></div>
      </div>

      {/* --- Sanction Module --- */}
      <div style={{ display: activeTab === 'san' ? 'block' : 'none' }}>
        <div className="row">
          <FormGroup label="Sanctioned Amount"><input type="number" value={formLead.sanctionAmt} onChange={e => handleFormFieldChange('sanctionAmt', e.target.value)} /></FormGroup>
          <FormGroup label="ROI (%)"><input type="number" value={formLead.sanctionROI} onChange={e => handleFormFieldChange('sanctionROI', e.target.value)} /></FormGroup>
          <FormGroup label="Tenure (months)"><input type="number" value={formLead.sanctionTenure} onChange={e => handleFormFieldChange('sanctionTenure', e.target.value)} /></FormGroup>
        </div>
        <div className="row">
          <FormGroup label="Calculated EMI"><input value={formLead.sanctionEMI} readOnly /></FormGroup>
          <FormGroup label="Sanction Remarks"><input value={formLead.sanctionRemarks} onChange={e => handleFormFieldChange('sanctionRemarks', e.target.value)} /></FormGroup>
        </div>
        <div style={{ marginTop: '8px' }}><button className="btn primary" onClick={handleCalculateEMI}>Calculate EMI</button></div>
      </div>

      {/* --- Disbursement Module --- */}
      <div style={{ display: activeTab === 'disb' ? 'block' : 'none' }}>
        <div className="row">
          <FormGroup label="Disbursed Amount"><input type="number" value={formLead.disbAmt} onChange={e => handleFormFieldChange('disbAmt', e.target.value)} /></FormGroup>
          <FormGroup label="UTR"><input value={formLead.utr} onChange={e => handleFormFieldChange('utr', e.target.value)} /></FormGroup>
          <FormGroup label="Disbursement Date"><input type="date" value={formLead.disbDate} onChange={e => handleFormFieldChange('disbDate', e.target.value)} /></FormGroup>
        </div>
        <div style={{ marginTop: '8px' }}><button className="btn primary" onClick={onConfirmDisb}>Confirm Disbursement</button></div>
      </div>

      {/* --- Deviations Module --- */}
      <div style={{ display: activeTab === 'dev' ? 'block' : 'none' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input ref={devNameRef} className="input" placeholder="Deviation name" />
          <input ref={devExpectedRef} className="input" placeholder="Expected" />
          <input ref={devActualRef} className="input" placeholder="Actual" />
          <button className="btn" onClick={handleAddDeviation}>Add</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Expected</th><th>Actual</th><th>Status</th><th>Remarks</th></tr></thead>
          <tbody>
            {currentDeviations.length === 0 ? (
              <tr><td colSpan="5" style={{textAlign: 'center'}}>No deviations</td></tr>
            ) : (
              currentDeviations.map(d => (
                <tr key={d.id}>
                  <td>{safe(d.name)}</td>
                  <td>{safe(d.expected)}</td>
                  <td>{safe(d.actual)}</td>
                  <td>{safe(d.status)}</td>
                  <td>{safe(d.remarks || '')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}