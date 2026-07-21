import React, { useState } from 'react';
import Navbar from './components/Navbar';
import RecipientDashboard from './pages/RecipientDashboard';
import DonorDashboard from './pages/DonorDashboard';
import DoctorConsole from './pages/DoctorConsole';
import './styles/global.css';

export default function App() {
  const [role, setRole] = useState('recipient');

  const renderPage = () => {
    switch (role) {
      case 'donor':     return <DonorDashboard />;
      case 'doctor':    return <DoctorConsole />;
      case 'recipient':
      default:          return <RecipientDashboard />;
    }
  };

  return (
    <>
      <Navbar currentRole={role} onRoleChange={setRole} />
      {renderPage()}
    </>
  );
}
