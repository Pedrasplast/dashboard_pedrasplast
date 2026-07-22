import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Home from '../componentes/Home';
import ImportadorCarga from '../componentes/ImportadorCarga';
import Cadastro from '../componentes/Cadastro';
import Login from '../componentes/Login';
import GerenciarUsuarios from '../componentes/GerenciarUsuarios';
import Dashboard from '../componentes/Dashboard';
import TelaRelatorios from '../relatorio/TelaRelatorios';

export function AppRoutes({ user, isAdmin }) {
  return (
    <Routes>
      <Route path="/" element={<Home user={user} isAdmin={isAdmin} />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/relatorios" element={user ? <TelaRelatorios /> : <Navigate to="/login" />} />
      <Route path="/importar" element={user && isAdmin ? <ImportadorCarga /> : <Navigate to="/" />} />
      <Route path="/usuarios" element={user && isAdmin ? <GerenciarUsuarios /> : <Navigate to="/" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
    </Routes>
  );
}