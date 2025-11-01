import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, USERS } = useAuth();
  
  // Default to the first user in the list (Admin)
  const [selectedUserId, setSelectedUserId] = useState(USERS[0].id); 

  const handleLogin = (e) => {
    e.preventDefault(); // Prevent form submission
    if (selectedUserId) {
      login(selectedUserId);
    }
  };

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={handleLogin}>
        <h2>LOS Portal Login</h2>
        <p>Select a user role to simulate login:</p>
        
        {/* We reuse the FormGroup styles for consistency */}
        <div className="form-group">
          <label htmlFor="login-select">User Role</label>
          <select 
            id="login-select" 
            value={selectedUserId} 
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {USERS.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
        
        <button type="submit" className="btn primary" style={{ width: '100%', padding: '12px', fontSize: '16px' }}>
          Login
        </button>
      </form>
    </div>
  );
}