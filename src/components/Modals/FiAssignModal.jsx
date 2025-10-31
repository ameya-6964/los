import React, { useRef } from 'react';
import ModalWrapper from './ModalWrapper';
import FormGroup from '../LeadForm/FormGroup';
import { useLeads } from '../../contexts/LeadsContext';
import { useToast } from '../../contexts/ToastContext';

export default function FiAssignModal({ leadId, onClose }) {
  const { assignFiAgent, isLoading } = useLeads();
  const { showToast } = useToast();
  const nameRef = useRef();

  const handleAssign = async () => {
    const name = nameRef.current.value;
    if (!name) {
      return showToast('Agent name required', 'warning');
    }
    await assignFiAgent(leadId, name);
    onClose();
  };

  return (
    <ModalWrapper title="Assign Field Agent" onClose={onClose}>
      <FormGroup label="Agent Name">
        <input ref={nameRef} />
      </FormGroup>
      <div style={{ marginTop: '8px' }}>
        <button className="btn primary" onClick={handleAssign} disabled={isLoading}>
          {isLoading ? 'Assigning...' : 'Assign'}
        </button>
      </div>
    </ModalWrapper>
  );
}