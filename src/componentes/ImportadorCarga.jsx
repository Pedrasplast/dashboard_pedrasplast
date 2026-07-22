import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../Servicos/clienteSupabase';
import { parse, formatISO, isValid } from 'date-fns';
import { FiArrowLeft } from 'react-icons/fi';
import './ImportadorCarga.css';

export default function ImportadorCarga() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);
  const [status, setStatus] = useState('');
  const [porcentagem, setPorcentagem] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [tabelaDestino, setTabelaDestino] = useState('carga_maquina');
  const fileInputRef = useRef(null);

  // Proteção contra fechamento acidental durante o upload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (carregando) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [carregando]);

  // Funções utilitárias otimizadas com useCallback
  const formatarData = useCallback((valor) => {
    if (!valor) return null;
    if (typeof valor === 'number') {
      const dataJS = new Date((valor - 25569) * 86400 * 1000);
      return dataJS.toISOString().split('T')[0];
    }
    if (typeof valor === 'string') {
      let dataConvertida = parse(valor.trim(), 'dd/MM/yyyy HH:mm:ss', new Date());
      if (isValid(dataConvertida)) return formatISO(dataConvertida, { representation: 'date' });

      dataConvertida = parse(valor.trim(), 'dd/MM/yyyy', new Date());
      if (isValid(dataConvertida)) return formatISO(dataConvertida, { representation: 'date' });
    }
    return null;
  }, []);

  const parseNumero = useCallback((valor) => {
    if (valor === undefined || valor === null || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    
    const limpo = String(valor).trim().replace(',', '.');
    const resultado = parseFloat(limpo);
    return isNaN(resultado) ? 0 : resultado;
  }, []);

  // Processamento e importação em blocos para não travar a UI (Non-blocking)
  const processarArquivo = useCallback(async (file) => {
    if (!file) return;

    setCarregando(true);
    setStatus('Lendo arquivo...');
    setPorcentagem(0);

    const reader = new FileReader();

    reader.onload = (evt) => {
      // Usamos setTimeout para liberar o Event Loop do React renderizar o estado inicial de loading
      setTimeout(async () => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet);

          if (rows.length === 0) throw new Error("A planilha está vazia.");

          setStatus('Formatando dados...');
          
          const dadosFormatados = rows.map((linha) => {
            const getVal = (chavesPossiveis) => {
              const chaveEncontrada = Object.keys(linha).find(k => 
                chavesPossiveis.some(cp => k.trim().toLowerCase() === cp.toLowerCase())
              );
              return chaveEncontrada !== undefined ? linha[chaveEncontrada] : '';
            };

            if (tabelaDestino === 'ciclo_injetora') {
              return {
                injetora: String(getVal(['Injetora']) || ''),
                data: formatarData(getVal(['Data'])),
                cod_produto: String(getVal(['Cód. Produto', 'Cod. Produto', 'Cod Produto', 'Codigo Produto']) || ''),
                descricao: String(getVal(['Descrição', 'Descricao']) || ''),
                cavidade_molde: parseInt(parseNumero(getVal(['Cavidade Molde', 'Cavidade']))),
                tempo_resfriamento: String(getVal(['Tempo de Resfriamento', 'Resfriamento']) || ''),
                ciclo: String(getVal(['Ciclo']) || ''),
                tempo_injecao: String(getVal(['Tempo de Injeção', 'Tempo Injecao']) || ''),
                kg_un: parseNumero(getVal(['Kg UN', 'KG UN', 'Kg/Un'])),
                kg_haste: parseNumero(getVal(['Kg HASTE', 'KG HASTE', 'Kg/Haste'])),
                observacao: String(getVal(['Observação', 'Observacao', 'Obs']) || '')
              };
            } else {
              return {
                cod_prod: String(getVal(['Cód.Prod', 'Cod. Prod', 'Cod Prod', 'Cód. Produto', 'Cod_Prod']) || ''),
                injetora: String(getVal(['Injetora']) || ''),
                inicio: formatarData(getVal(['Início', 'Inicio'])),
                fim: formatarData(getVal(['Fim', 'Término', 'Termino'])),
                duracao: String(getVal(['Duração', 'Duracao', 'Tempo']) || ''),
                op: String(getVal(['OP', 'Ordem', 'Ordem Producao']) || ''),
                tipo: String(getVal(['Tipo']) || ''),
                motivo: String(getVal(['Motivo']) || ''),
                justificativa: String(getVal(['Justificativa']) || ''),
                celula: String(getVal(['Célula', 'Celula']) || ''),
                operador: String(getVal(['Operador']) || ''),
                material: String(getVal(['Material']) || ''),
                qtde_perdida_devido_pausa: parseNumero(getVal(['Qtde perdida devido pausa', 'Qtde Perdida Devido Pausa'])),
                cliente: String(getVal(['Cliente']) || ''),
                status: String(getVal(['Status']) || ''),
                lista_de_data: formatarData(getVal(['ListaDeData', 'Lista De Data'])),
                inicio_dia: formatarData(getVal(['InicioDia', 'Início Dia', 'InícioDia'])),
                fim_dia: formatarData(getVal(['FimDia', 'Fim Dia'])),
                tempo: String(getVal(['Tempo']) || ''),
                conforme: parseInt(parseNumero(getVal(['Conforme']))),
                danificada: parseInt(parseNumero(getVal(['Danificada']))),
                mp: String(getVal(['M.P', 'MP']) || ''),
                pecas: parseInt(parseNumero(getVal(['Peças', 'Pecas']))),
                no_injetora: String(getVal(['№ Injetora', 'No Injetor', 'Nº Injetora']) || ''),
                peso: parseNumero(getVal(['Peso'])),
                consumido: parseNumero(getVal(['Consumido']))
              };
            }
          });

          const totalLinhas = dadosFormatados.length;
          const tamanhoLote = 500;
          setStatus(`Enviando ${totalLinhas} registros...`);

          for (let i = 0; i < totalLinhas; i += tamanhoLote) {
            const lote = dadosFormatados.slice(i, i + tamanhoLote);
            const { error: insertError } = await supabase.from(tabelaDestino).insert(lote);
            
            if (insertError) throw insertError;
            
            setPorcentagem(Math.round(((i + lote.length) / totalLinhas) * 100));
          }

          setStatus(`✅ Sucesso: ${totalLinhas} registros importados.`);
        } catch (err) {
          setStatus(`❌ Erro: ${err.message}`);
        } finally {
          setCarregando(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }, 50);
    };

    reader.readAsBinaryString(file);
  }, [tabelaDestino, formatarData, parseNumero]);

  // Handlers otimizados de UI
  const handleVoltar = useCallback(() => navigate('/'), [navigate]);
  const handleTabelaChange = useCallback((e) => setTabelaDestino(e.target.value), []);
  const handleDragOver = useCallback((e) => e.preventDefault(), []);
  const handleDragEnter = useCallback((e) => { e.preventDefault(); setIsDragActive(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragActive(false), []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (!carregando && e.dataTransfer.files[0]) {
      processarArquivo(e.dataTransfer.files[0]);
    }
  }, [carregando, processarArquivo]);
  const handleDropzoneClick = useCallback(() => {
    if (!carregando && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [carregando]);
  const handleFileChange = useCallback((e) => {
    if (e.target.files[0]) {
      processarArquivo(e.target.files[0]);
    }
  }, [processarArquivo]);

  return (
    <div className="importador-container">
      <button className="back-importador-btn" onClick={handleVoltar}>
        <FiArrowLeft /> <span>Página Inicial</span>
      </button>

      <div className="importador-card">
        <h3>Importador de Dados</h3>

        <div className="select-tabela">
          <label>Selecione a tabela de destino:</label>
          <select
            value={tabelaDestino}
            onChange={handleTabelaChange}
            disabled={carregando}
          >
            <option value="carga_maquina">Carga Máquina</option>
            <option value="ciclo_injetora">Ciclo Injetora</option>
          </select>
        </div>

        <div 
          className={`upload-dropzone ${isDragActive ? 'drag-active' : ''} ${carregando ? 'disabled' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleDropzoneClick}
        >
          <input 
            ref={fileInputRef} 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />
          <p>{carregando ? "Processando arquivo..." : "Arraste o arquivo ou clique aqui"}</p>
        </div>

        {status && (
          <div className="status-container">
            <p>{status}</p>
            {carregando && (
              <div className="progress-bar-container" style={{ width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' }}>
                <div className="progress-bar-fill" style={{ width: `${porcentagem}%`, height: '8px', background: '#3b82f6', transition: 'width 0.2s ease' }}></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}