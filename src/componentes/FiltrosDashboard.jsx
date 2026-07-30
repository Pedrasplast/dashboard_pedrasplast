import React, {
    useCallback,
    useMemo,
    useState
} from 'react';

import { DayPicker } from '@daypicker/react';
import { ptBR } from '@daypicker/react/locale';

import '@daypicker/react/style.css';
import './FiltrosDashboard.css';

const formatarDataISO = (data) => {
    if (
        !(data instanceof Date) ||
        Number.isNaN(data.getTime())
    ) {
        return '';
    }

    const ano = data.getFullYear();

    const mes = String(
        data.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
        data.getDate()
    ).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
};

const converterISOParaData = (valorISO) => {
    if (!valorISO) {
        return undefined;
    }

    const correspondencia = String(
        valorISO
    ).match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (!correspondencia) {
        return undefined;
    }

    const ano = Number(
        correspondencia[1]
    );

    const mes =
        Number(correspondencia[2]) - 1;

    const dia = Number(
        correspondencia[3]
    );

    const data = new Date(
        ano,
        mes,
        dia
    );

    if (
        data.getFullYear() !== ano ||
        data.getMonth() !== mes ||
        data.getDate() !== dia
    ) {
        return undefined;
    }

    return data;
};

/*
 * Retorna somente a data oficial do registro.
 *
 * A prioridade é lista_de_data, pois ela representa
 * diretamente o dia do registro no banco.
 */
const extrairDataRegistro = (registro) => {
    const valorData =
        registro?.lista_de_data ||
        registro?.inicio ||
        registro?.inicio_dia ||
        registro?.data ||
        null;

    if (!valorData) {
        return null;
    }

    const textoData =
        String(valorData).trim();

    /*
     * Extrai diretamente YYYY-MM-DD.
     * Isso evita mudança de data pelo fuso horário.
     */
    const correspondencia =
        textoData.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (correspondencia) {
        const dataISO = [
            correspondencia[1],
            correspondencia[2],
            correspondencia[3]
        ].join('-');

        return converterISOParaData(
            dataISO
        )
            ? dataISO
            : null;
    }

    const data = new Date(
        valorData
    );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return null;
    }

    return formatarDataISO(data);
};

const formatarDataVisual = (valorISO) => {
    const data =
        converterISOParaData(
            valorISO
        );

    if (!data) {
        return '';
    }

    return data.toLocaleDateString(
        'pt-BR'
    );
};

export default function FiltrosDashboard({
    filtros,
    setFiltros,
    rawDados = [],

    exibirPeriodo = true,
    exibirInjetora = true,
    exibirProduto = true,
    exibirMp = true,
    exibirTipo = true,

    tiposDisponiveis = [],
    produtosDisponiveis = [],
    mpsDisponiveis = []
}) {
    const [
        calendarioAberto,
        setCalendarioAberto
    ] = useState(null);

    /*
     * Conjunto contendo somente os dias
     * que possuem registros no banco.
     */
    const datasComDados = useMemo(() => {
        return new Set(
            rawDados
                .map(extrairDataRegistro)
                .filter(Boolean)
        );
    }, [rawDados]);

    const datasOrdenadas = useMemo(() => {
        return [
            ...datasComDados
        ].sort();
    }, [datasComDados]);

    const primeiraDataDisponivel =
        datasOrdenadas[0] || null;

    const ultimaDataDisponivel =
        datasOrdenadas[
            datasOrdenadas.length - 1
        ] || null;

    const dataInicioSelecionada =
        useMemo(() => {
            return converterISOParaData(
                filtros.dataInicio
            );
        }, [filtros.dataInicio]);

    const dataFimSelecionada =
        useMemo(() => {
            return converterISOParaData(
                filtros.dataFim
            );
        }, [filtros.dataFim]);

    const mesInicialCalendario =
        useMemo(() => {
            return (
                dataInicioSelecionada ||
                dataFimSelecionada ||
                converterISOParaData(
                    ultimaDataDisponivel
                ) ||
                new Date()
            );
        }, [
            dataInicioSelecionada,
            dataFimSelecionada,
            ultimaDataDisponivel
        ]);

    const toggleTipo =
        useCallback(
            (tipo) => {
                setFiltros(
                    (anterior) => {
                        const tiposAtuais =
                            Array.isArray(
                                anterior.tipo
                            )
                                ? anterior.tipo
                                : [];

                        const novosTipos =
                            tiposAtuais.includes(
                                tipo
                            )
                                ? tiposAtuais.filter(
                                    (tipoAtual) =>
                                        tipoAtual !== tipo
                                )
                                : [
                                    ...tiposAtuais,
                                    tipo
                                ];

                        return {
                            ...anterior,
                            tipo: novosTipos
                        };
                    }
                );
            },
            [setFiltros]
        );

    const limparDatas =
        useCallback(() => {
            setFiltros(
                (anterior) => ({
                    ...anterior,
                    dataInicio: '',
                    dataFim: ''
                })
            );

            setCalendarioAberto(null);
        }, [setFiltros]);

    /*
     * Confirma se uma data realmente existe
     * entre os registros carregados do banco.
     */
    const dataPossuiRegistro =
        useCallback(
            (data) => {
                const dataISO =
                    formatarDataISO(
                        data
                    );

                return (
                    dataISO !== '' &&
                    datasComDados.has(
                        dataISO
                    )
                );
            },
            [datasComDados]
        );

    /*
     * Calendário inicial:
     *
     * - bloqueia dias sem dados;
     * - bloqueia dias posteriores à data final.
     */
    const desabilitarDataInicio =
        useCallback(
            (data) => {
                if (
                    !dataPossuiRegistro(
                        data
                    )
                ) {
                    return true;
                }

                if (
                    dataFimSelecionada &&
                    data >
                        dataFimSelecionada
                ) {
                    return true;
                }

                return false;
            },
            [
                dataPossuiRegistro,
                dataFimSelecionada
            ]
        );

    /*
     * Calendário final:
     *
     * - bloqueia dias sem dados;
     * - bloqueia dias anteriores à data inicial.
     */
    const desabilitarDataFim =
        useCallback(
            (data) => {
                if (
                    !dataPossuiRegistro(
                        data
                    )
                ) {
                    return true;
                }

                if (
                    dataInicioSelecionada &&
                    data <
                        dataInicioSelecionada
                ) {
                    return true;
                }

                return false;
            },
            [
                dataPossuiRegistro,
                dataInicioSelecionada
            ]
        );

    /*
     * A validação é feita novamente no clique.
     * Assim, uma data sem registro nunca é salva,
     * mesmo que haja algum problema visual.
     */
    const selecionarDataInicio =
        useCallback(
            (data) => {
                if (
                    !data ||
                    !dataPossuiRegistro(data)
                ) {
                    return;
                }

                const novaDataInicio =
                    formatarDataISO(
                        data
                    );

                setFiltros(
                    (anterior) => ({
                        ...anterior,

                        dataInicio:
                            novaDataInicio,

                        dataFim:
                            anterior.dataFim &&
                            anterior.dataFim <
                                novaDataInicio
                                ? ''
                                : anterior.dataFim
                    })
                );

                setCalendarioAberto(null);
            },
            [
                dataPossuiRegistro,
                setFiltros
            ]
        );

    const selecionarDataFim =
        useCallback(
            (data) => {
                if (
                    !data ||
                    !dataPossuiRegistro(data)
                ) {
                    return;
                }

                const novaDataFim =
                    formatarDataISO(
                        data
                    );

                if (
                    filtros.dataInicio &&
                    novaDataFim <
                        filtros.dataInicio
                ) {
                    return;
                }

                setFiltros(
                    (anterior) => ({
                        ...anterior,
                        dataFim:
                            novaDataFim
                    })
                );

                setCalendarioAberto(null);
            },
            [
                dataPossuiRegistro,
                filtros.dataInicio,
                setFiltros
            ]
        );

    const injetorasDisponiveis =
        useMemo(() => {
            return [
                ...new Set(
                    rawDados
                        .map(
                            (registro) =>
                                registro.injetora
                        )
                        .filter(Boolean)
                )
            ].sort((a, b) =>
                String(a).localeCompare(
                    String(b),
                    'pt-BR',
                    {
                        numeric: true,
                        sensitivity:
                            'base'
                    }
                )
            );
        }, [rawDados]);

    return (
        <div className="filter-section">
            {exibirPeriodo && (
                <>
                    <div className="filter-header-row">
                        <label>
                            PERÍODO
                        </label>

                        <button
                            type="button"
                            className="clear-date-btn"
                            onClick={limparDatas}
                        >
                            ✕ LIMPAR
                        </button>
                    </div>

                    <div className="date-inputs-container">
                        <div className="calendar-field">
                            <button
                                type="button"
                                className="calendar-trigger"
                                disabled={
                                    datasOrdenadas.length === 0
                                }
                                onClick={() =>
                                    setCalendarioAberto(
                                        (atual) =>
                                            atual === 'inicio'
                                                ? null
                                                : 'inicio'
                                    )
                                }
                            >
                                <span>
                                    Data inicial
                                </span>

                                <strong>
                                    {filtros.dataInicio
                                        ? formatarDataVisual(
                                            filtros.dataInicio
                                        )
                                        : 'Selecionar'}
                                </strong>
                            </button>

                            {calendarioAberto ===
                                'inicio' && (
                                <div className="calendar-popover">
                                    <DayPicker
                                        mode="single"
                                        locale={ptBR}
                                        selected={
                                            dataInicioSelecionada
                                        }
                                        onSelect={
                                            selecionarDataInicio
                                        }
                                        disabled={
                                            desabilitarDataInicio
                                        }
                                        modifiers={{
                                            comDados:
                                                dataPossuiRegistro
                                        }}
                                        modifiersClassNames={{
                                            comDados:
                                                'calendar-day-has-data'
                                        }}
                                        defaultMonth={
                                            mesInicialCalendario
                                        }
                                        startMonth={
                                            converterISOParaData(
                                                primeiraDataDisponivel
                                            )
                                        }
                                        endMonth={
                                            converterISOParaData(
                                                ultimaDataDisponivel
                                            )
                                        }
                                        showOutsideDays={
                                            false
                                        }
                                    />

                                    <small className="calendar-info">
                                        Somente dias com dados podem ser selecionados.
                                    </small>
                                </div>
                            )}
                        </div>

                        <div className="calendar-field">
                            <button
                                type="button"
                                className="calendar-trigger"
                                disabled={
                                    datasOrdenadas.length === 0
                                }
                                onClick={() =>
                                    setCalendarioAberto(
                                        (atual) =>
                                            atual === 'fim'
                                                ? null
                                                : 'fim'
                                    )
                                }
                            >
                                <span>
                                    Data final
                                </span>

                                <strong>
                                    {filtros.dataFim
                                        ? formatarDataVisual(
                                            filtros.dataFim
                                        )
                                        : 'Selecionar'}
                                </strong>
                            </button>

                            {calendarioAberto ===
                                'fim' && (
                                <div className="calendar-popover">
                                    <DayPicker
                                        mode="single"
                                        locale={ptBR}
                                        selected={
                                            dataFimSelecionada
                                        }
                                        onSelect={
                                            selecionarDataFim
                                        }
                                        disabled={
                                            desabilitarDataFim
                                        }
                                        modifiers={{
                                            comDados:
                                                dataPossuiRegistro
                                        }}
                                        modifiersClassNames={{
                                            comDados:
                                                'calendar-day-has-data'
                                        }}
                                        defaultMonth={
                                            mesInicialCalendario
                                        }
                                        startMonth={
                                            converterISOParaData(
                                                primeiraDataDisponivel
                                            )
                                        }
                                        endMonth={
                                            converterISOParaData(
                                                ultimaDataDisponivel
                                            )
                                        }
                                        showOutsideDays={
                                            false
                                        }
                                    />

                                    <small className="calendar-info">
                                        Somente dias com dados podem ser selecionados.
                                    </small>
                                </div>
                            )}
                        </div>
                    </div>

                    {datasOrdenadas.length ===
                        0 && (
                        <small className="calendar-empty">
                            Nenhuma data encontrada na base.
                        </small>
                    )}
                </>
            )}

            {exibirInjetora && (
                <>
                    <label>
                        INJETORA
                    </label>

                    <select
                        value={
                            filtros.injetora ||
                            'Todos'
                        }
                        onChange={(evento) =>
                            setFiltros(
                                (anterior) => ({
                                    ...anterior,

                                    injetora:
                                        evento.target.value,

                                    cod_prod:
                                        'Todos'
                                })
                            )
                        }
                    >
                        <option value="Todos">
                            Todas
                        </option>

                        {injetorasDisponiveis.map(
                            (injetora) => (
                                <option
                                    key={injetora}
                                    value={injetora}
                                >
                                    {injetora}
                                </option>
                            )
                        )}
                    </select>
                </>
            )}

            {exibirProduto && (
                <>
                    <label>
                        CÓD. PROD
                    </label>

                    <select
                        value={
                            filtros.cod_prod ||
                            'Todos'
                        }
                        disabled={
                            exibirInjetora &&
                            filtros.injetora ===
                                'Todos'
                        }
                        onChange={(evento) =>
                            setFiltros(
                                (anterior) => ({
                                    ...anterior,

                                    cod_prod:
                                        evento.target.value
                                })
                            )
                        }
                    >
                        <option value="Todos">
                            Todos
                        </option>

                        {produtosDisponiveis.map(
                            (produto) => (
                                <option
                                    key={produto}
                                    value={produto}
                                >
                                    {produto}
                                </option>
                            )
                        )}
                    </select>
                </>
            )}

            {exibirMp && (
                <>
                    <label>
                        MATÉRIA-PRIMA
                    </label>

                    <select
                        value={
                            filtros.mp ||
                            'Todos'
                        }
                        onChange={(evento) =>
                            setFiltros(
                                (anterior) => ({
                                    ...anterior,

                                    mp:
                                        evento.target.value
                                })
                            )
                        }
                    >
                        <option value="Todos">
                            Todas
                        </option>

                        {mpsDisponiveis.map(
                            (mp) => (
                                <option
                                    key={mp}
                                    value={mp}
                                >
                                    {mp}
                                </option>
                            )
                        )}
                    </select>
                </>
            )}

            {exibirTipo &&
                tiposDisponiveis.length >
                    0 && (
                    <>
                        <label>
                            TIPO
                        </label>

                        <div className="checkbox-group">
                            {tiposDisponiveis.map(
                                (tipo) => (
                                    <label
                                        key={tipo}
                                        className="checkbox-label"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(
                                                filtros.tipo ||
                                                []
                                            ).includes(
                                                tipo
                                            )}
                                            onChange={() =>
                                                toggleTipo(
                                                    tipo
                                                )
                                            }
                                        />

                                        <span>
                                            {tipo}
                                        </span>
                                    </label>
                                )
                            )}
                        </div>
                    </>
                )}
        </div>
    );
}