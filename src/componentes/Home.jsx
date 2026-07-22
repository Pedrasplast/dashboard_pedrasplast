import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../Servicos/clienteSupabase';
import './Home.css';

function Home({ user, isAdmin }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setLoadingLogin(true);
    setLoginError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginError(
        error.message === 'Invalid login credentials'
          ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
          : error.message
      );
      setPassword('');
    } else {
      setPassword('');
    }
    setLoadingLogin(false);
  }, [email, password]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setPassword('');
  }, []);

  const goToDashboard = useCallback(() => navigate('/dashboard'), [navigate]);
  const goToRelatorios = useCallback(() => navigate('/relatorios'), [navigate]); // <-- Adicionado aqui
  const goToImportar = useCallback(() => navigate('/importar'), [navigate]);
  const goToUsuarios = useCallback(() => navigate('/usuarios'), [navigate]);
  const goToCadastro = useCallback(() => navigate('/cadastro'), [navigate]);

  return (
    <div className="home-screen">
      <div className="welcome-banner">
        <h1>Seja bem-vindo ao Painel de Produção</h1>
        <p>Visão integrada da produtividade por máquina, identificação de paradas e monitoramento de eficiência operacional.</p>
      </div>

      <div className="home-grid">
        <div className="info-card">
          <h3>O que você deseja fazer?</h3>
          <div className="action-guide">
            <div className="guide-item" onClick={goToDashboard}>
              <span className="guide-icon">📈</span>
              <div>
                <h4>Visualizar Dashboard</h4>
                <p>Gráficos de eficiência, peças fabricadas, tempos de atividade e análise de paradas.</p>
              </div>
            </div>

            {/* Card de Relatórios atualizado com a função 
            <div className="guide-item" onClick={goToRelatorios}>
              <span className="guide-icon">📊</span>
              <div>
                <h4>Gerar Relatórios</h4>
                <p>Filtre dados por status e período para exportar relatórios detalhados em PDF ou Excel.</p>
              </div>
            </div> */}

            {user && isAdmin && (
              <>
                <div className="guide-item" onClick={goToImportar}>
                  <span className="guide-icon">📥</span>
                  <div>
                    <h4>Importar Carga Máquina</h4>
                    <p>Envio em massa de planilhas de programação de injetoras.</p>
                  </div>
                </div>

                <div className="guide-item" onClick={goToUsuarios}>
                  <span className="guide-icon">👥</span>
                  <div>
                    <h4>Gerenciar Usuários</h4>
                    <p>Controle permissões, níveis de acesso e perfis de colaboradores.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="auth-card">
          {user ? (
            <div className="profile-logged-card">
              <div className="avatar">👤</div>
              <h3>Sessão Ativa</h3>
              <p className="email-text">{user.email}</p>

              <div className="role-box">
                Nível de Acesso: <strong>{isAdmin ? 'Administrador' : 'Operador'}</strong>
              </div>

              {isAdmin ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <button className="btn-action-primary" onClick={goToImportar}>
                    Ir para Importador
                  </button>
                  <button className="btn-action-primary" onClick={goToUsuarios} style={{ backgroundColor: '#2b6cb0' }}>
                    Gerenciar Usuários
                  </button>
                </div>
              ) : (
                <button className="btn-action-primary" onClick={goToDashboard}>
                  Ir para Dashboard
                </button>
              )}

              <button className="btn-logout-secundario" onClick={handleLogout}>
                Sair da Conta
              </button>
            </div>
          ) : (
            <div className="login-form-wrapper">
              <h3>Acesso ao Sistema</h3>
              <p className="login-subtitle">Faça login para continuar</p>

              {loginError && <div className="login-error-alert">{loginError}</div>}

              <form onSubmit={handleLogin} className="login-form">
                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    placeholder="nome@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Senha</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <button type="submit" className="btn-submit" disabled={loadingLogin}>
                  {loadingLogin ? 'Autenticando...' : 'Entrar'}
                </button>
              </form>

              <div className="login-footer-actions">
                <span className="separator-text">ou</span>
                <button
                  type="button"
                  className="btn-link-cadastro"
                  onClick={goToCadastro}
                >
                  Criar nova conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;