/* ======= Helpers ======= */
export const now = () => new Date().toISOString();
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const safe = (s) => (s == null ? '' : String(s));

/* ======= Business Logic ======= */
export function calcEMI(P, annualRate, months) {
  P = Number(P || 0);
  annualRate = Number(annualRate || 0);
  months = Number(months || 0);
  if (!P || !annualRate || !months) return 0;
  const r = annualRate / 12 / 100;
  const emi = (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi);
}

export function calculateAge(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) {
    age--;
  }
  return age;
}

export function runBRELogic(lead, breConfig) {
  const cfg = breConfig;
  const reasons = [];
  const age = calculateAge(lead.dob);
  const cibil = Number(lead.cibil || 0);
  const income = Number(lead.income || 0);
  const existingEmi = Number(lead.total_emi || 0);
  const requested = Number(lead.requested || 0);
  const expectedEmi = Math.round(calcEMI(requested, 12, 36));
  const foir = income ? Math.round(((existingEmi + expectedEmi) / income) * 10000) / 100 : 999;

  if (age == null) reasons.push('DOB missing');
  else if (age < cfg.minAge || age > cfg.maxAge) reasons.push(`Age ${age} outside ${cfg.minAge}-${cfg.maxAge}`);
  if (cibil && cibil < cfg.minCibil) reasons.push(`CIBIL ${cibil} < ${cfg.minCibil}`);
  if (income && income < cfg.minIncome) reasons.push(`Income ${income} < ${cfg.minIncome}`);
  if (foir && foir > cfg.maxFoir) reasons.push(`FOIR ${foir}% > ${cfg.maxFoir}%`);

  let decision = 'Hold', risk = 'Medium';
  if (reasons.length === 0) {
    decision = 'Approve'; risk = 'Low';
  } else if (reasons.some(r => r.startsWith('Age') || r.startsWith('CIBIL'))) {
    decision = 'Reject'; risk = 'High';
  } else {
    decision = 'Hold'; risk = 'Medium';
  }
  return { decision, risk, foir, expectedEmi, reasons };
}

export function tokenOverlap(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase(); b = b.toLowerCase();
  if (a === b) return 1;
  const at = a.split(/\s+/), bt = b.split(/\s+/);
  const common = at.filter(x => bt.includes(x)).length;
  return common / Math.max(at.length, bt.length);
}

export function dedupeScore(qde, dde) {
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

export const getNextStage = (stage, STAGES) => STAGES[STAGES.indexOf(stage) + 1] || null;
export const getPrevStage = (stage, STAGES) => STAGES[STAGES.indexOf(stage) - 1] || null;

export const addAudit = (lead, msg) => {
  return {
    ...lead,
    audit: [...(lead.audit || []), { ts: now(), msg }]
  };
};