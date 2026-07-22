import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';
import { supabase } from '../Servicos/clienteSupabase';
import './GerenciarUsuarios.css';

function GerenciarUsuarios() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  
  // Estado para controlar o modal de confirmação de exclusão
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);

  // Efeito para apagar a mensagem automaticamente após 3 segundos
  useEffect(() => {
    if (!mensagem.texto) return;

    const timer = setTimeout(() => {
      setMensagem({ tipo: '', texto: '' });
    }, 3000);

    return () => clearTimeout(timer);
  }, [mensagem]);

  // Busca inicial otimizada
  const carregarUsuarios = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, email, regra')
        .order('email', { ascending: true });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: `Erro ao buscar usuários: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  // Atualização Otimista: A interface muda na hora, a requisição corre em background
  const alterarRegra = useCallback(async (usuarioId, novaRegra) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, regra: novaRegra } : u))
    );
    setMensagem({ tipo: 'sucesso', texto: 'Nível de acesso atualizado com sucesso!' });

    try {
      const { error } = await supabase
        .from('perfis')
        .update({ regra: novaRegra })
        .eq('id', usuarioId);

      if (error) {
        carregarUsuarios();
        throw error;
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: `Erro ao atualizar nível: ${error.message}` });
    }
  }, [carregarUsuarios]);

  // Executa a exclusão completa após confirmar no modal personalizado
  const confirmarExclusao = useCallback(async () => {
    if (!usuarioParaExcluir) return;

    const { id: usuarioId, email: emailUsuario } = usuarioParaExcluir;
    setUsuarioParaExcluir(null); // Fecha o modal

    const usuariosAnteriores = usuarios;
    setUsuarios((prev) => prev.filter((u) => u.id !== usuarioId));
    setMensagem({ tipo: 'sucesso', texto: 'Usuário excluído completamente com sucesso!' });

    try {
      const { error } = await supabase.rpc('apagar_usuario_completo', {
        usuario_id: usuarioId,
      });

      if (error) {
        setUsuarios(usuariosAnteriores);
        throw error;
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: `Erro ao excluir usuário: ${error.message}` });
    }
  }, [usuarioParaExcluir, usuarios]);

  // Renderização otimizada das linhas da tabela
  const linhasTabela = useMemo(() => {
    if (usuarios.length === 0) {
      return (
        <tr>
          <td colSpan="4" className="tabela-vazia">
            Nenhum usuário cadastrado encontrado.
          </td>
        </tr>
      );
    }

    return usuarios.map((user) => (
      <tr key={user.id}>
        <td className="user-email-col">{user.email}</td>
        <td>
          <span className={`badge-role ${user.regra}`}>
            {user.regra === 'admin' ? 'Administrador' : 'Operador'}
          </span>
        </td>
        <td className="col-centralizada">
          {user.regra === 'admin' ? (
            <button
              className="btn-change-role op"
              onClick={() => alterarRegra(user.id, 'operador')}
            >
              Rebaixar para Operador
            </button>
          ) : (
            <button
              className="btn-change-role adm"
              onClick={() => alterarRegra(user.id, 'admin')}
            >
              Promover a Admin
            </button>
          )}
        </td>
        <td className="col-centralizada">
          <button
            className="btn-delete-user"
            onClick={() => setUsuarioParaExcluir(user)}
          >
            Excluir
          </button>
        </td>
      </tr>
    ));
  }, [usuarios, alterarRegra]);

  return (
    <div className="gerenciar-usuarios-container">    
      <button className="btn-voltar-home" onClick={() => navigate('/')}>
         <FiArrowLeft /> <span>Página Inicial</span>
      </button>

      <div className="admin-header-block">
        <h2>Gerenciamento de Usuários</h2>
        <p>Altere permissões e níveis de acesso dos colaboradores cadastrados.</p>
      </div>

      {mensagem.texto && (
        <div className={`alert-message ${mensagem.tipo}`}>
          <span>{mensagem.texto}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Carregando usuários...</div>
      ) : (
        <div className="table-responsive">
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Perfil Atual</th>
                <th className="col-centralizada">Ações de Permissão</th>
                <th className="col-centralizada">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhasTabela}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Customizado de Confirmação */}
      {usuarioParaExcluir && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon-alert">
              <FiAlertTriangle />
            </div>
            <h3>Confirmar Exclusão</h3>
            <p>
              Tem certeza que deseja excluir completamente o acesso de <strong>{usuarioParaExcluir.email}</strong>? Esta ação não poderá ser desfeita.
            </p>
            <div className="modal-actions">
              <button
                className="btn-modal-cancelar"
                onClick={() => setUsuarioParaExcluir(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-modal-confirmar"
                onClick={confirmarExclusao}
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GerenciarUsuarios;