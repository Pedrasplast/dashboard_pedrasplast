import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

import {
  formatISO,
  isValid,
  parse
} from 'date-fns';

import { FiArrowLeft } from 'react-icons/fi';

import { supabase } from '../Servicos/clienteSupabase';
import './ImportadorCarga.css';

const NOME_ABA_IMPORTACAO = 'banco';
const TAMANHO_LOTE = 500;

export default function ImportadorCarga() {
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(false);
  const [status, setStatus] = useState('');
  const [porcentagem, setPorcentagem] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const [tabelaDestino, setTabelaDestino] =
    useState('carga_maquina');

  const fileInputRef = useRef(null);

  /*
   * Evita o fechamento acidental da página
   * durante o envio dos registros.
   */
  useEffect(() => {
    const handleBeforeUnload = (evento) => {
      if (!carregando) {
        return;
      }

      evento.preventDefault();
      evento.returnValue = '';
    };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, [carregando]);

  /*
   * Converte datas do Excel para YYYY-MM-DD.
   */
  const formatarData = useCallback((valor) => {
    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return null;
    }

    /*
     * Data serial do Excel.
     */
    if (typeof valor === 'number') {
      const dataExcel =
        XLSX.SSF.parse_date_code(valor);

      if (!dataExcel) {
        return null;
      }

      const ano = String(
        dataExcel.y
      ).padStart(4, '0');

      const mes = String(
        dataExcel.m
      ).padStart(2, '0');

      const dia = String(
        dataExcel.d
      ).padStart(2, '0');

      return `${ano}-${mes}-${dia}`;
    }

    /*
     * Caso o XLSX retorne um objeto Date.
     */
    if (valor instanceof Date) {
      if (
        Number.isNaN(
          valor.getTime()
        )
      ) {
        return null;
      }

      return formatISO(
        valor,
        {
          representation: 'date'
        }
      );
    }

    /*
     * Datas em texto.
     */
    if (typeof valor === 'string') {
      const texto = valor.trim();

      if (!texto) {
        return null;
      }

      const formatosPossiveis = [
        'dd/MM/yyyy HH:mm:ss',
        'dd/MM/yyyy HH:mm',
        'dd/MM/yyyy',
        'yyyy-MM-dd HH:mm:ss',
        'yyyy-MM-dd HH:mm',
        'yyyy-MM-dd'
      ];

      for (
        const formato of formatosPossiveis
      ) {
        const dataConvertida =
          parse(
            texto,
            formato,
            new Date()
          );

        if (
          isValid(
            dataConvertida
          )
        ) {
          return formatISO(
            dataConvertida,
            {
              representation: 'date'
            }
          );
        }
      }
    }

    return null;
  }, []);


  /*
   * Converte data e hora do Excel para timestamp ISO.
   *
   * O valor é enviado com o fuso de Brasília (-03:00).
   * Em colunas timestamptz, o Supabase pode exibir o equivalente em UTC,
   * mas ao formatar para America/Sao_Paulo a hora será a mesma do Excel.
   */
  const formatarDataHora = useCallback((valor) => {
    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return null;
    }

    const montarTimestamp = (
      ano,
      mes,
      dia,
      hora = 0,
      minuto = 0,
      segundo = 0
    ) => {
      const anoFormatado = String(ano).padStart(4, '0');
      const mesFormatado = String(mes).padStart(2, '0');
      const diaFormatado = String(dia).padStart(2, '0');
      const horaFormatada = String(hora).padStart(2, '0');
      const minutoFormatado = String(minuto).padStart(2, '0');
      const segundoFormatado = String(
        Math.floor(segundo)
      ).padStart(2, '0');

      return (
        `${anoFormatado}-${mesFormatado}-${diaFormatado}` +
        `T${horaFormatada}:${minutoFormatado}:${segundoFormatado}-03:00`
      );
    };

    /*
     * Número serial do Excel contendo data e hora.
     */
    if (typeof valor === 'number') {
      const dataExcel =
        XLSX.SSF.parse_date_code(valor);

      if (!dataExcel) {
        return null;
      }

      return montarTimestamp(
        dataExcel.y,
        dataExcel.m,
        dataExcel.d,
        dataExcel.H || 0,
        dataExcel.M || 0,
        dataExcel.S || 0
      );
    }

    /*
     * Caso venha como objeto Date.
     */
    if (valor instanceof Date) {
      if (Number.isNaN(valor.getTime())) {
        return null;
      }

      return montarTimestamp(
        valor.getFullYear(),
        valor.getMonth() + 1,
        valor.getDate(),
        valor.getHours(),
        valor.getMinutes(),
        valor.getSeconds()
      );
    }

    /*
     * Caso venha como texto.
     */
    const texto = String(valor).trim();

    if (!texto) {
      return null;
    }

    const formatosPossiveis = [
      'dd/MM/yyyy HH:mm:ss',
      'dd/MM/yyyy HH:mm',
      'dd/MM/yyyy',
      'yyyy-MM-dd HH:mm:ss',
      'yyyy-MM-dd HH:mm',
      'yyyy-MM-dd'
    ];

    for (const formato of formatosPossiveis) {
      const dataConvertida =
        parse(
          texto,
          formato,
          new Date()
        );

      if (isValid(dataConvertida)) {
        return montarTimestamp(
          dataConvertida.getFullYear(),
          dataConvertida.getMonth() + 1,
          dataConvertida.getDate(),
          dataConvertida.getHours(),
          dataConvertida.getMinutes(),
          dataConvertida.getSeconds()
        );
      }
    }

    return null;
  }, []);

  /*
   * Converte durações do Excel para HH:MM:SS.
   *
   * Exemplos:
   * 0:00:03  -> 00:00:03
   * 2:12:14  -> 02:12:14
   * 74:32:00 -> 74:32:00
   */
  const formatarDuracao = useCallback((valor) => {
    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return '';
    }

    let totalSegundos = null;

    /*
     * O Excel armazena duração como fração de um dia.
     *
     * Exemplo:
     * 1 = 24 horas
     * 0,5 = 12 horas
     */
    if (typeof valor === 'number') {
      if (!Number.isFinite(valor)) {
        return '';
      }

      totalSegundos =
        Math.round(
          valor * 24 * 60 * 60
        );
    }

    /*
     * Proteção caso a biblioteca retorne um objeto Date.
     */
    else if (valor instanceof Date) {
      if (
        Number.isNaN(
          valor.getTime()
        )
      ) {
        return '';
      }

      /*
       * Datas de duração do Excel normalmente usam
       * dezembro de 1899 como referência.
       */
      const baseExcelUTC =
        Date.UTC(
          1899,
          11,
          30,
          0,
          0,
          0
        );

      const valorUTC =
        Date.UTC(
          valor.getUTCFullYear(),
          valor.getUTCMonth(),
          valor.getUTCDate(),
          valor.getUTCHours(),
          valor.getUTCMinutes(),
          valor.getUTCSeconds()
        );

      totalSegundos =
        Math.round(
          (
            valorUTC -
            baseExcelUTC
          ) / 1000
        );

      /*
       * Caso a diferença não seja válida,
       * usa apenas hora, minuto e segundo.
       */
      if (
        !Number.isFinite(totalSegundos) ||
        totalSegundos < 0
      ) {
        totalSegundos =
          valor.getUTCHours() * 3600 +
          valor.getUTCMinutes() * 60 +
          valor.getUTCSeconds();
      }
    }

    /*
     * Duração em texto.
     */
    else {
      const texto =
        String(valor)
          .trim()
          .replace(/\s+/g, '');

      if (!texto) {
        return '';
      }

      /*
       * Aceita:
       * HH:MM
       * HH:MM:SS
       * HHH:MM:SS
       */
      const resultado =
        texto.match(
          /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/
        );

      if (!resultado) {
        /*
         * Caso seja um número decimal em texto.
         */
        const numeroConvertido =
          Number(
            texto.replace(',', '.')
          );

        if (
          Number.isFinite(
            numeroConvertido
          )
        ) {
          totalSegundos =
            Math.round(
              numeroConvertido *
              24 *
              60 *
              60
            );
        } else {
          return texto;
        }
      } else {
        const horas =
          Number(resultado[1]);

        const minutos =
          Number(resultado[2]);

        const segundos =
          Number(
            resultado[3] || 0
          );

        totalSegundos =
          horas * 3600 +
          minutos * 60 +
          segundos;
      }
    }

    if (
      totalSegundos === null ||
      !Number.isFinite(totalSegundos)
    ) {
      return '';
    }

    totalSegundos =
      Math.max(
        0,
        Math.round(totalSegundos)
      );

    const horas =
      Math.floor(
        totalSegundos / 3600
      );

    const minutos =
      Math.floor(
        (
          totalSegundos % 3600
        ) / 60
      );

    const segundos =
      totalSegundos % 60;

    return [
      String(horas).padStart(2, '0'),
      String(minutos).padStart(2, '0'),
      String(segundos).padStart(2, '0')
    ].join(':');
  }, []);

  /*
   * Converte números brasileiros e internacionais.
   */
  const parseNumero = useCallback((valor) => {
    if (
      valor === undefined ||
      valor === null ||
      valor === ''
    ) {
      return 0;
    }

    if (typeof valor === 'number') {
      return Number.isFinite(valor)
        ? valor
        : 0;
    }

    let texto =
      String(valor)
        .trim()
        .replace(/\s/g, '');

    /*
     * Formato brasileiro: 1.234,56
     */
    if (
      texto.includes(',') &&
      texto.includes('.')
    ) {
      texto = texto
        .replace(/\./g, '')
        .replace(',', '.');
    } else {
      texto =
        texto.replace(',', '.');
    }

    const resultado =
      Number.parseFloat(texto);

    return Number.isFinite(resultado)
      ? resultado
      : 0;
  }, []);

  /*
   * Limpa espaços, quebras de linha e tabulações.
   */
  const limparTexto = useCallback((valor) => {
    return String(valor ?? '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  /*
   * Normaliza nomes de cabeçalhos.
   */
  const normalizarCabecalho =
    useCallback((valor) => {
      return String(valor || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(
          /[\u0300-\u036f]/g,
          ''
        )
        .replace(/\s+/g, ' ');
    }, []);

  /*
   * Processa e envia o arquivo.
   */
  const processarArquivo =
    useCallback(
      async (file) => {
        if (!file) {
          return;
        }

        const extensao =
          file.name
            .split('.')
            .pop()
            ?.toLowerCase();

        if (
          ![
            'xlsx',
            'xls',
            'xlsm'
          ].includes(extensao)
        ) {
          setStatus(
            '❌ Erro: selecione um arquivo Excel .xlsx, .xls ou .xlsm.'
          );

          return;
        }

        setCarregando(true);
        setStatus('Lendo arquivo...');
        setPorcentagem(0);

        const reader =
          new FileReader();

        reader.onerror = () => {
          setStatus(
            '❌ Erro ao ler o arquivo.'
          );

          setCarregando(false);

          if (
            fileInputRef.current
          ) {
            fileInputRef.current.value =
              '';
          }
        };

        reader.onload = (evento) => {
          setTimeout(
            async () => {
              try {
                const conteudo =
                  evento.target?.result;

                if (!conteudo) {
                  throw new Error(
                    'Não foi possível ler o conteúdo do arquivo.'
                  );
                }

                /*
                 * cellDates: false é importante.
                 *
                 * Assim as durações permanecem como números
                 * do Excel e não viram datas de 1899.
                 */
                const workbook =
                  XLSX.read(
                    conteudo,
                    {
                      type: 'array',
                      cellDates: false,
                      cellNF: true,
                      cellText: true
                    }
                  );

                /*
                 * Localiza somente a aba Banco.
                 */
                const nomeAbaEncontrada =
                  workbook.SheetNames.find(
                    (nomeAba) =>
                      nomeAba
                        .trim()
                        .toLowerCase() ===
                      NOME_ABA_IMPORTACAO
                  );

                if (
                  !nomeAbaEncontrada
                ) {
                  const abasEncontradas =
                    workbook.SheetNames
                      .map(
                        (nome) =>
                          `"${nome}"`
                      )
                      .join(', ');

                  throw new Error(
                    `A aba "Banco" não foi encontrada. Abas existentes: ${
                      abasEncontradas ||
                      'nenhuma'
                    }.`
                  );
                }

                const sheet =
                  workbook.Sheets[
                    nomeAbaEncontrada
                  ];

                if (!sheet) {
                  throw new Error(
                    'Não foi possível acessar a aba Banco.'
                  );
                }

                /*
                 * Converte somente a aba Banco.
                 */
                const rows =
                  XLSX.utils.sheet_to_json(
                    sheet,
                    {
                      defval: '',
                      raw: true
                    }
                  );

                if (
                  rows.length === 0
                ) {
                  throw new Error(
                    'A aba Banco está vazia.'
                  );
                }

                setStatus(
                  `Lendo a aba "${nomeAbaEncontrada}" e formatando os dados...`
                );

                const dadosFormatados =
                  rows.map(
                    (
                      linha,
                      indice
                    ) => {
                      const linhaExcel =
                        indice + 2;

                      const getVal = (
                        chavesPossiveis
                      ) => {
                        const chavesNormalizadas =
                          chavesPossiveis.map(
                            normalizarCabecalho
                          );

                        const chaveEncontrada =
                          Object.keys(
                            linha
                          ).find(
                            (chave) =>
                              chavesNormalizadas.includes(
                                normalizarCabecalho(
                                  chave
                                )
                              )
                          );

                        return chaveEncontrada !==
                          undefined
                          ? linha[
                              chaveEncontrada
                            ]
                          : '';
                      };

                      /*
                       * Tabela Ciclo Injetora.
                       */
                      if (
                        tabelaDestino ===
                        'ciclo_injetora'
                      ) {
                        const registroCiclo = {
                          injetora:
                            limparTexto(
                              getVal([
                                'Injetora'
                              ])
                            ),

                          data:
                            formatarData(
                              getVal([
                                'Data'
                              ])
                            ),

                          cod_produto:
                            limparTexto(
                              getVal([
                                'Cód. Produto',
                                'Cod. Produto',
                                'Cod Produto',
                                'Codigo Produto'
                              ])
                            ),

                          descricao:
                            limparTexto(
                              getVal([
                                'Descrição',
                                'Descricao'
                              ])
                            ),

                          cavidade_molde:
                            Math.trunc(
                              parseNumero(
                                getVal([
                                  'Cavidade Molde',
                                  'Cavidade'
                                ])
                              )
                            ),

                          tempo_resfriamento:
                            formatarDuracao(
                              getVal([
                                'Tempo de Resfriamento',
                                'Resfriamento'
                              ])
                            ),

                          ciclo:
                            formatarDuracao(
                              getVal([
                                'Ciclo'
                              ])
                            ),

                          tempo_injecao:
                            formatarDuracao(
                              getVal([
                                'Tempo de Injeção',
                                'Tempo Injecao'
                              ])
                            ),

                          kg_un:
                            parseNumero(
                              getVal([
                                'Kg UN',
                                'KG UN',
                                'Kg/Un'
                              ])
                            ),

                          kg_haste:
                            parseNumero(
                              getVal([
                                'Kg HASTE',
                                'KG HASTE',
                                'Kg/Haste'
                              ])
                            ),

                          observacao:
                            limparTexto(
                              getVal([
                                'Observação',
                                'Observacao',
                                'Obs'
                              ])
                            )
                        };

                        Object.defineProperty(
                          registroCiclo,
                          '__linhaExcel',
                          {
                            value: linhaExcel,
                            enumerable: false
                          }
                        );

                        return registroCiclo;
                      }

                      /*
                       * Tabela Carga Máquina.
                       */
                      const registro = {
                        cod_prod:
                          limparTexto(
                            getVal([
                              'Cód.Prod',
                              'Cod. Prod',
                              'Cod Prod',
                              'Cód. Produto',
                              'Cod_Prod'
                            ])
                          ),

                        injetora:
                          limparTexto(
                            getVal([
                              'Injetora'
                            ])
                          ),

                        inicio:
                          formatarDataHora(
                            getVal([
                              'Início',
                              'Inicio'
                            ])
                          ),

                        fim:
                          formatarDataHora(
                            getVal([
                              'Fim',
                              'Término',
                              'Termino'
                            ])
                          ),

                        /*
                         * Usa somente a coluna Duração.
                         * Não usa mais Tempo como alternativa.
                         */
                        duracao:
                          formatarDuracao(
                            getVal([
                              'Duração',
                              'Duracao'
                            ])
                          ),

                        op:
                          limparTexto(
                            getVal([
                              'OP',
                              'Ordem',
                              'Ordem Producao'
                            ])
                          ),

                        tipo:
                          limparTexto(
                            getVal([
                              'Tipo'
                            ])
                          ),

                        motivo:
                          limparTexto(
                            getVal([
                              'Motivo'
                            ])
                          ),

                        justificativa:
                          limparTexto(
                            getVal([
                              'Justificativa'
                            ])
                          ),

                        celula:
                          limparTexto(
                            getVal([
                              'Célula',
                              'Celula'
                            ])
                          ),

                        operador:
                          limparTexto(
                            getVal([
                              'Operador'
                            ])
                          ),

                        material:
                          limparTexto(
                            getVal([
                              'Material'
                            ])
                          ),

                        qtde_perdida_devido_pausa:
                          parseNumero(
                            getVal([
                              'Qtde perdida devido pausa',
                              'Qtde Perdida Devido Pausa'
                            ])
                          ),

                        cliente:
                          limparTexto(
                            getVal([
                              'Cliente'
                            ])
                          ),

                        status:
                          limparTexto(
                            getVal([
                              'Status'
                            ])
                          ),

                        lista_de_data:
                          formatarData(
                            getVal([
                              'ListaDeData',
                              'Lista De Data',
                              'Lista de Data'
                            ])
                          ),

                        inicio_dia:
                          formatarDataHora(
                            getVal([
                              'InicioDia',
                              'Início Dia',
                              'InícioDia'
                            ])
                          ),

                        fim_dia:
                          formatarDataHora(
                            getVal([
                              'FimDia',
                              'Fim Dia'
                            ])
                          ),

                        tempo:
                          formatarDuracao(
                            getVal([
                              'Tempo'
                            ])
                          ),

                        conforme:
                          Math.trunc(
                            parseNumero(
                              getVal([
                                'Conforme'
                              ])
                            )
                          ),

                        danificada:
                          Math.trunc(
                            parseNumero(
                              getVal([
                                'Danificada'
                              ])
                            )
                          ),

                        mp:
                          limparTexto(
                            getVal([
                              'M.P',
                              'MP'
                            ])
                          ),

                        pecas:
                          Math.trunc(
                            parseNumero(
                              getVal([
                                'Peças',
                                'Pecas'
                              ])
                            )
                          ),

                        no_injetora:
                          limparTexto(
                            getVal([
                              '№ Injetora',
                              'No Injetor',
                              'Nº Injetora'
                            ])
                          ),

                        peso:
                          parseNumero(
                            getVal([
                              'Peso'
                            ])
                          ),

                        consumido:
                          parseNumero(
                            getVal([
                              'Consumido'
                            ])
                          )
                      };

                      Object.defineProperty(
                        registro,
                        '__linhaExcel',
                        {
                          value: linhaExcel,
                          enumerable: false
                        }
                      );

                      return registro;
                    }
                  );

                /*
                 * Remove linhas sem conteúdo útil.
                 */
                const registrosValidos =
                  dadosFormatados.filter(
                    (registro) => {
                      if (
                        tabelaDestino ===
                        'ciclo_injetora'
                      ) {
                        return Boolean(
                          registro.injetora ||
                          registro.data ||
                          registro.cod_produto
                        );
                      }

                      return Boolean(
                        registro.injetora ||
                        registro.cod_prod ||
                        registro.status ||
                        registro.motivo
                      );
                    }
                  );

                if (
                  registrosValidos.length ===
                  0
                ) {
                  throw new Error(
                    'A aba Banco não contém registros válidos para importação.'
                  );
                }

                setStatus(
                  `Enviando ${registrosValidos.length} registros da aba Banco...`
                );

                /*
                 * Envio em lotes.
                 */
                for (
                  let indice = 0;
                  indice < registrosValidos.length;
                  indice += TAMANHO_LOTE
                ) {
                  const lote =
                    registrosValidos.slice(
                      indice,
                      indice + TAMANHO_LOTE
                    );

                  const {
                    error: insertError
                  } = await supabase
                    .from(tabelaDestino)
                    .insert(lote);

                  if (insertError) {
                    const primeiraLinha =
                      lote[0]?.__linhaExcel;

                    throw new Error(
                      primeiraLinha
                        ? `Falha no lote iniciado na linha ${primeiraLinha} da aba Banco: ${insertError.message}`
                        : insertError.message
                    );
                  }

                  const processados =
                    Math.min(
                      indice + lote.length,
                      registrosValidos.length
                    );

                  setPorcentagem(
                    Math.round(
                      (
                        processados /
                        registrosValidos.length
                      ) * 100
                    )
                  );
                }

                setStatus(
                  `✅ Sucesso: ${registrosValidos.length} registros importados somente da aba "${nomeAbaEncontrada}".`
                );
              } catch (erro) {
                console.error(
                  'Erro durante a importação:',
                  erro
                );

                setStatus(
                  `❌ Erro: ${
                    erro?.message ||
                    'Falha desconhecida durante a importação.'
                  }`
                );
              } finally {
                setCarregando(false);

                if (
                  fileInputRef.current
                ) {
                  fileInputRef.current.value =
                    '';
                }
              }
            },
            50
          );
        };

        reader.readAsArrayBuffer(file);
      },
      [
        tabelaDestino,
        formatarData,
        formatarDataHora,
        formatarDuracao,
        parseNumero,
        limparTexto,
        normalizarCabecalho
      ]
    );

  const handleVoltar =
    useCallback(
      () => navigate('/'),
      [navigate]
    );

  const handleTabelaChange =
    useCallback(
      (evento) => {
        setTabelaDestino(
          evento.target.value
        );

        setStatus('');
        setPorcentagem(0);
      },
      []
    );

  const handleDragOver =
    useCallback((evento) => {
      evento.preventDefault();
    }, []);

  const handleDragEnter =
    useCallback((evento) => {
      evento.preventDefault();
      setIsDragActive(true);
    }, []);

  const handleDragLeave =
    useCallback((evento) => {
      evento.preventDefault();

      if (
        !evento.currentTarget.contains(
          evento.relatedTarget
        )
      ) {
        setIsDragActive(false);
      }
    }, []);

  const handleDrop =
    useCallback(
      (evento) => {
        evento.preventDefault();
        setIsDragActive(false);

        const arquivo =
          evento.dataTransfer.files?.[0];

        if (
          !carregando &&
          arquivo
        ) {
          processarArquivo(
            arquivo
          );
        }
      },
      [
        carregando,
        processarArquivo
      ]
    );

  const handleDropzoneClick =
    useCallback(() => {
      if (
        !carregando &&
        fileInputRef.current
      ) {
        fileInputRef.current.click();
      }
    }, [carregando]);

  const handleFileChange =
    useCallback(
      (evento) => {
        const arquivo =
          evento.target.files?.[0];

        if (arquivo) {
          processarArquivo(
            arquivo
          );
        }
      },
      [processarArquivo]
    );

  const handleDropzoneKeyDown =
    useCallback(
      (evento) => {
        if (
          evento.key === 'Enter' ||
          evento.key === ' '
        ) {
          evento.preventDefault();
          handleDropzoneClick();
        }
      },
      [handleDropzoneClick]
    );

  return (
    <div className="importador-container">
      <button
        type="button"
        className="back-importador-btn"
        onClick={handleVoltar}
        disabled={carregando}
      >
        <FiArrowLeft />

        <span>
          Página Inicial
        </span>
      </button>

      <div className="importador-card">
        <h3>
          Importador de Dados
        </h3>

        <div className="select-tabela">
          <label htmlFor="tabela-destino">
            Selecione a tabela de destino:
          </label>

          <select
            id="tabela-destino"
            value={tabelaDestino}
            onChange={handleTabelaChange}
            disabled={carregando}
          >
            <option value="carga_maquina">
              Carga Máquina
            </option>

            <option value="ciclo_injetora">
              Ciclo Injetora
            </option>
          </select>
        </div>

        <div
          className={[
            'upload-dropzone',
            isDragActive
              ? 'drag-active'
              : '',
            carregando
              ? 'disabled'
              : ''
          ]
            .filter(Boolean)
            .join(' ')}
          role="button"
          tabIndex={
            carregando ? -1 : 0
          }
          aria-disabled={carregando}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleDropzoneClick}
          onKeyDown={handleDropzoneKeyDown}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm"
            onChange={handleFileChange}
            disabled={carregando}
            style={{
              display: 'none'
            }}
          />

          <p>
            {carregando
              ? 'Processando a aba Banco...'
              : 'Arraste o arquivo ou clique aqui'}
          </p>

          {!carregando && (
            <small>
              Formatos aceitos: XLSX, XLS e XLSM. Somente a aba “Banco” será importada.
            </small>
          )}
        </div>

        {status && (
          <div className="status-container">
            <p>
              {status}
            </p>

            {carregando && (
              <div
                className="progress-bar-container"
                style={{
                  width: '100%',
                  marginTop: '8px',
                  overflow: 'hidden',
                  background: '#e2e8f0',
                  borderRadius: '999px'
                }}
              >
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${porcentagem}%`,
                    height: '8px',
                    background:
                      'linear-gradient(90deg, #0b1f5e, #2e5bba, #3dbb63)',
                    transition:
                      'width 0.2s ease'
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}