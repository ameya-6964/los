import React, { useRef } from 'react';
import ModalWrapper from './ModalWrapper';
import FormGroup from '../LeadForm/FormGroup';

export default function FiAssignModal({ onClose, onAssign }) {
  const nameRef = useRef();

  const handleAssign = () => {
    onAssign(nameRef.current.value);
  };

  return (
    <ModalWrapper title="Assign Field Agent" onClose={onClose}>
      <FormGroup label="Agent Name">
        <input ref={nameRef} />
      </FormGroup>
      <div style={{ marginTop: '8px' }}>
        <button className="btn primary" onClick={handleAssign}>Assign</button>
      </div>
    </ModalWrapper>
  );
}