import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { usePerfil } from './hooks/usePerfil';
import { AppRoutes } from './routes/AppRoutes';
import HeaderActions from './componentes/HeaderActions';

import './App.css';

function App() {
  const { user } = useAuth();
  const { isAdmin } = usePerfil(user);

  return (
    <Router>
      <div className="app-layout">
        <HeaderActions user={user} isAdmin={isAdmin} />

        <main className="main-content">
          <AppRoutes user={user} isAdmin={isAdmin} />
        </main>
      </div>
    </Router>
  );
}

export default App;