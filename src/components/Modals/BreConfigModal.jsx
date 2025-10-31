import React, { useRef, useEffect } from 'react';
import ModalWrapper from './ModalWrapper';
import FormGroup from '../LeadForm/FormGroup';

export default function BreConfigModal({ bre, onClose, onSave, onReset }) {
  const cibilRef = useRef();
  const ageMinRef = useRef();
  const ageMaxRef = useRef();
  const incomeRef = useRef();
  const foirRef = useRef();

  useEffect(() => {
    cibilRef.current.value = bre.minCibil;
    ageMinRef.current.value = bre.minAge;
    ageMaxRef.current.value = bre.maxAge;
    incomeRef.current.value = bre.minIncome;
    foirRef.current.value = bre.maxFoir;
  }, [bre]);

  const handleSave = () => {
    onSave({
      minCibil: Number(cibilRef.current.value || 650),
      minAge: Number(ageMinRef.current.value || 21),
      maxAge: Number(ageMaxRef.current.value || 65),
      minIncome: Number(incomeRef.current.value || 15000),
      maxFoir: Number(foirRef.current.value || 50)
    });
  };

  return (
    <ModalWrapper title="BRE Configuration" onClose={onClose}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
        <FormGroup label="Min CIBIL"><input ref={cibilRef} type="number" /></FormGroup>
        <FormGroup label="Min Age"><input ref={ageMinRef} type="number" /></FormGroup>
        <FormGroup label="Max Age"><input ref={ageMaxRef} type="number" /></FormGroup>
        <FormGroup label="Min Income"><input ref={incomeRef} type="number" /></FormGroup>
        <FormGroup label="Max FOIR (%)"><input ref={foirRef} type="number" /></FormGroup>
      </div>
      <div style={{ marginTop: '12px' }}>
        <button className="btn primary" onClick={handleSave}>Save</button>
        <button className="btn" onClick={onReset}>Reset</button>
      </div>
    </ModalWrapper>
  );
}