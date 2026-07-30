import React, {
  useState,
  useCallback
} from 'react';

import {
  useNavigate
} from 'react-router-dom';

import {
  supabase
} from '../Servicos/clienteSupabase';

import './Home.css';

function Home({
  user,
  isAdmin
}) {
  const navigate = useNavigate();

  const [
    email,
    setEmail
  ] = useState('');

  const [
    password,
    setPassword
  ] = useState('');

  const [
    loadingLogin,
    setLoadingLogin
  ] = useState(false);

  const [
    loginError,
    setLoginError
  ] = useState('');

  const handleLogin =
    useCallback(
      async (e) => {
        e.preventDefault();

        setLoadingLogin(true);
        setLoginError('');

        const {
          error
        } =
          await supabase.auth
            .signInWithPassword({
              email,
              password
            });

        if (error) {
          setLoginError(
            error.message ===
              'Invalid login credentials'
              ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
              : error.message
          );

          setPassword('');
        } else {
          setPassword('');
        }

        setLoadingLogin(false);
      },
      [
        email,
        password
      ]
    );

  const handleLogout =
    useCallback(
      async () => {
        await supabase.auth.signOut();

        setPassword('');
      },
      []
    );

  /*
   * Dashboard atual de produção.
   */
  const goToDashboard =
    useCallback(
      () =>
        navigate('/dashboard'),
      [navigate]
    );

  /*
   * Novo dashboard de matéria-prima.
   */
  const goToDashboardMateriaPrima =
    useCallback(
      () =>
        navigate(
          '/dashboard-materia-prima'
        ),
      [navigate]
    );

  /*
   * Novo dashboard de produtividade.
   */
  const goToDashboardProdutividade =
    useCallback(
      () =>
        navigate(
          '/dashboard-produtividade'
        ),
      [navigate]
    );

  const goToRelatorios =
    useCallback(
      () =>
        navigate('/relatorios'),
      [navigate]
    );

  const goToImportar =
    useCallback(
      () =>
        navigate('/importar'),
      [navigate]
    );

  const goToUsuarios =
    useCallback(
      () =>
        navigate('/usuarios'),
      [navigate]
    );

  const goToCadastro =
    useCallback(
      () =>
        navigate('/cadastro'),
      [navigate]
    );

  return (
    <div className="home-screen">
      <div className="welcome-banner">
        <h1>
          Seja bem-vindo ao Painel de Produção
        </h1>

        <p>
          Visão integrada da produtividade por
          máquina, identificação de paradas e
          monitoramento de eficiência operacional.
        </p>
      </div>

      <div className="home-grid">
        <div className="info-card">
          <h3>
            O que você deseja fazer?
          </h3>

          <div className="action-guide">
            {/* Dashboard de Produção */}
            <div
              className="guide-item"
              onClick={goToDashboard}
              role="button"
              tabIndex={0}
              onKeyDown={(evento) => {
                if (
                  evento.key === 'Enter' ||
                  evento.key === ' '
                ) {
                  evento.preventDefault();
                  goToDashboard();
                }
              }}
            >
              <span className="guide-icon">
                📈
              </span>

              <div>
                <h4>
                  Dashboard de Produção
                </h4>

                <p>
                  Acompanhe peças conformes,
                  danificadas, qualidade, horas
                  trabalhadas e motivos de parada.
                </p>
              </div>
            </div>

            {/* Dashboard de Matéria-Prima */}
            <div
              className="guide-item"
              onClick={
                goToDashboardMateriaPrima
              }
              role="button"
              tabIndex={0}
              onKeyDown={(evento) => {
                if (
                  evento.key === 'Enter' ||
                  evento.key === ' '
                ) {
                  evento.preventDefault();

                  goToDashboardMateriaPrima();
                }
              }}
            >
              <span className="guide-icon">
                🧱
              </span>

              <div>
                <h4>
                  Dashboard de Matéria-Prima
                </h4>

                <p>
                  Acompanhe consumo, movimentações,
                  materiais utilizados e indicadores
                  relacionados à matéria-prima.
                </p>
              </div>
            </div>

            {/* Dashboard de Produtividade */}
            <div
              className="guide-item"
              onClick={
                goToDashboardProdutividade
              }
              role="button"
              tabIndex={0}
              onKeyDown={(evento) => {
                if (
                  evento.key === 'Enter' ||
                  evento.key === ' '
                ) {
                  evento.preventDefault();

                  goToDashboardProdutividade();
                }
              }}
            >
              <span className="guide-icon">
                ⚙️
              </span>

              <div>
                <h4>
                  Dashboard de Produtividade
                </h4>

                <p>
                  Analise produtividade por máquina,
                  período, produto, operador e
                  desempenho operacional.
                </p>
              </div>
            </div>

            {/*
            <div
              className="guide-item"
              onClick={goToRelatorios}
            >
              <span className="guide-icon">
                📊
              </span>

              <div>
                <h4>
                  Gerar Relatórios
                </h4>

                <p>
                  Filtre dados por status e período
                  para exportar relatórios detalhados
                  em PDF ou Excel.
                </p>
              </div>
            </div>
            */}

            {user && isAdmin && (
              <>
                <div
                  className="guide-item"
                  onClick={goToImportar}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(evento) => {
                    if (
                      evento.key === 'Enter' ||
                      evento.key === ' '
                    ) {
                      evento.preventDefault();
                      goToImportar();
                    }
                  }}
                >
                  <span className="guide-icon">
                    📥
                  </span>

                  <div>
                    <h4>
                      Importar Carga Máquina
                    </h4>

                    <p>
                      Envio em massa de planilhas de
                      programação de injetoras.
                    </p>
                  </div>
                </div>

                <div
                  className="guide-item"
                  onClick={goToUsuarios}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(evento) => {
                    if (
                      evento.key === 'Enter' ||
                      evento.key === ' '
                    ) {
                      evento.preventDefault();
                      goToUsuarios();
                    }
                  }}
                >
                  <span className="guide-icon">
                    👥
                  </span>

                  <div>
                    <h4>
                      Gerenciar Usuários
                    </h4>

                    <p>
                      Controle permissões, níveis de
                      acesso e perfis de colaboradores.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="auth-card">
          {user ? (
            <div className="profile-logged-card">
              <div className="avatar">
                👤
              </div>

              <h3>
                Sessão Ativa
              </h3>

              <p className="email-text">
                {user.email}
              </p>

              <div className="role-box">
                Nível de Acesso:{' '}

                <strong>
                  {isAdmin
                    ? 'Administrador'
                    : 'Operador'}
                </strong>
              </div>

              {isAdmin ? (
                <div className="profile-actions">
                  <button
                    type="button"
                    className="btn-action-primary"
                    onClick={goToImportar}
                  >
                    Ir para Importador
                  </button>

                  <button
                    type="button"
                    className="btn-action-primary btn-action-secondary"
                    onClick={goToUsuarios}
                  >
                    Gerenciar Usuários
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-action-primary"
                  onClick={goToDashboard}
                >
                  Ir para Dashboard de Produção
                </button>
              )}

              <button
                type="button"
                className="btn-logout-secundario"
                onClick={handleLogout}
              >
                Sair da Conta
              </button>
            </div>
          ) : (
            <div className="login-form-wrapper">
              <h3>
                Acesso ao Sistema
              </h3>

              <p className="login-subtitle">
                Faça login para continuar
              </p>

              {loginError && (
                <div className="login-error-alert">
                  {loginError}
                </div>
              )}

              <form
                onSubmit={handleLogin}
                className="login-form"
              >
                <div className="form-group">
                  <label htmlFor="login-email">
                    E-mail
                  </label>

                  <input
                    id="login-email"
                    type="email"
                    placeholder="nome@empresa.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">
                    Senha
                  </label>

                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    autoComplete="current-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-submit"
                  disabled={loadingLogin}
                >
                  {loadingLogin
                    ? 'Autenticando...'
                    : 'Entrar'}
                </button>
              </form>

              <div className="login-footer-actions">
                <span className="separator-text">
                  ou
                </span>

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