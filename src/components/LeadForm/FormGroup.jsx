import React from 'react';

export default function FormGroup({ label, children, style = {} }) {
  return (
    <div className="form-group" style={style}>
      <label>{label}</label>
      {children}
    </div>
  );
}