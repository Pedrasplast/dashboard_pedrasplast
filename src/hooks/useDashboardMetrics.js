import { useMemo } from 'react';

// Converte HH:MM:SS ou número decimal para horas decimais
const converterTempoParaHoras = (tempo) => {
    if (
        tempo === null ||
        tempo === undefined ||
        tempo === ''
    ) {
        return 0;
    }

    // Número armazenado como fração de dia
    if (typeof tempo === 'number') {
        return tempo * 24;
    }

    const texto = String(tempo).trim();

    // Duração no formato HH:MM:SS
    if (texto.includes(':')) {
        const partes = texto
            .split(':')
            .map(Number);

        const horas = partes[0] || 0;
        const minutos = partes[1] || 0;
        const segundos = partes[2] || 0;

        return (
            horas +
            minutos / 60 +
            segundos / 3600
        );
    }

    const numero = Number.parseFloat(
        texto.replace(',', '.')
    );

    if (Number.isFinite(numero)) {
        return numero * 24;
    }

    return 0;
};

// Formata horas decimais em HH:MM:SS
const formatarHorasParaHHMMSS = (
    totalHoras
) => {
    if (
        !Number.isFinite(totalHoras) ||
        totalHoras <= 0
    ) {
        return '00:00:00';
    }

    const segundosTotais = Math.round(
        totalHoras * 3600
    );

    const horas = Math.floor(
        segundosTotais / 3600
    );

    const minutos = Math.floor(
        (segundosTotais % 3600) / 60
    );

    const segundos =
        segundosTotais % 60;

    return `${String(horas).padStart(
        2,
        '0'
    )}:${String(minutos).padStart(
        2,
        '0'
    )}:${String(segundos).padStart(
        2,
        '0'
    )}`;
};

// Formata horas decimais em HH:MM
const formatarHorasParaHHMM = (
    totalHoras
) => {
    if (
        !Number.isFinite(totalHoras) ||
        totalHoras <= 0
    ) {
        return '00:00';
    }

    const minutosTotais = Math.round(
        totalHoras * 60
    );

    const horas = Math.floor(
        minutosTotais / 60
    );

    const minutos =
        minutosTotais % 60;

    return `${String(horas).padStart(
        2,
        '0'
    )}:${String(minutos).padStart(
        2,
        '0'
    )}`;
};

// Normaliza textos para comparação
const normalizarTexto = (valor) => {
    return String(valor || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

// Normaliza os tipos
const normalizarTipo = (tipo) => {
    return normalizarTexto(tipo)
        .replace(/\s+/g, '');
};

// Verifica se o Tipo 3 está selecionado
const tipo3EstaSelecionado = (
    tiposSelecionados
) => {
    const tipos = Array.isArray(
        tiposSelecionados
    )
        ? tiposSelecionados
        : [tiposSelecionados];

    return tipos.some((tipo) => {
        const valorNormalizado =
            normalizarTipo(tipo);

        const numeroEncontrado =
            valorNormalizado.match(/\d+/);

        return (
            numeroEncontrado &&
            Number(numeroEncontrado[0]) === 3
        );
    });
};

export const useDashboardMetrics = (
    dados,
    tiposSelecionados = []
) => {
    return useMemo(() => {
        const safeDados =
            Array.isArray(dados)
                ? dados
                : [];

        const listaTiposSelecionados =
            Array.isArray(tiposSelecionados)
                ? tiposSelecionados
                : [tiposSelecionados];

        /*
         * Tipos usados somente para filtrar
         * o gráfico de motivos.
         */
        const tiposSelecionadosSet =
            new Set(
                listaTiposSelecionados
                    .filter(
                        (tipo) =>
                            tipo !== null &&
                            tipo !== undefined &&
                            String(tipo).trim() !== ''
                    )
                    .map(normalizarTipo)
            );

        const existeFiltroTipo =
            tiposSelecionadosSet.size > 0;

        /*
         * Tipo 3 controla a inclusão das três
         * descrições no cartão Hora Parada.
         */
        const incluirParadasTipo3NoCartao =
            tipo3EstaSelecionado(
                listaTiposSelecionados
            );

        let totalConforme = 0;
        let totalDanificadas = 0;

        let horasTrabalhadasDec = 0;

        /*
         * Total completo das paradas.
         * Utilizado para manter o cartão
         * Total de Horas como estava.
         */
        let horasParadasTotalDec = 0;

        /*
         * Valor exibido no cartão Hora Parada.
         */
        let horasParadasCartaoDec = 0;

        const motivosMap = {};

        for (const registro of safeDados) {
            /*
             * Esses indicadores não são alterados
             * pelo filtro de tipo.
             */
            totalConforme += Number(
                registro.conforme || 0
            );

            totalDanificadas += Number(
                registro.danificada || 0
            );

            const status =
                normalizarTexto(
                    registro.status
                );

            const duracao =
                converterTempoParaHoras(
                    registro.duracao
                );

            /*
             * Hora Trabalhada permanece igual.
             */
            if (status === 'produzindo') {
                horasTrabalhadasDec +=
                    duracao;

                continue;
            }

            if (status !== 'indisponivel') {
                continue;
            }

            /*
             * Soma todas as paradas para manter
             * o Total de Horas completo.
             */
            horasParadasTotalDec +=
                duracao;

            const motivoNormalizado =
                normalizarTexto(
                    registro.motivo
                );

            /*
             * As três descrições associadas
             * ao Tipo 3 são:
             *
             * - Final de Semana/ sem expediente
             * - Feriado sem expediente
             * - Turno Reduzido
             */
            const ehParadaTipo3 =
                motivoNormalizado.includes(
                    'final de semana'
                ) ||
                motivoNormalizado.includes(
                    'feriado sem expediente'
                ) ||
                motivoNormalizado.includes(
                    'turno reduzido'
                );

            /*
             * Demais motivos entram sempre
             * no cartão Hora Parada.
             */
            if (!ehParadaTipo3) {
                horasParadasCartaoDec +=
                    duracao;
            }

            /*
             * As três descrições acima entram
             * somente quando o Tipo 3 estiver
             * selecionado.
             */
            if (
                ehParadaTipo3 &&
                incluirParadasTipo3NoCartao
            ) {
                horasParadasCartaoDec +=
                    duracao;
            }

            /*
             * FILTRO DO GRÁFICO
             *
             * Sem tipo marcado:
             * mostra todos os motivos.
             *
             * Com tipo marcado:
             * mostra apenas os motivos dos
             * tipos selecionados.
             */
            const tipoRegistro =
                normalizarTipo(
                    registro.tipo
                );

            const incluirNoGrafico =
                !existeFiltroTipo ||
                tiposSelecionadosSet.has(
                    tipoRegistro
                );

            if (
                incluirNoGrafico &&
                registro.motivo
            ) {
                const motivo =
                    String(
                        registro.motivo
                    ).trim();

                motivosMap[motivo] =
                    (
                        motivosMap[motivo] ||
                        0
                    ) + duracao;
            }
        }

        const totalProduzido =
            totalConforme +
            totalDanificadas;

        const qualidade =
            totalProduzido > 0
                ? (
                    totalConforme /
                    totalProduzido
                ) * 100
                : 0;

        /*
         * Mantém o Total de Horas como estava:
         * trabalhadas + todas as paradas.
         */
        const horasTotaisDec =
            horasTrabalhadasDec +
            horasParadasCartaoDec;

        return {
            totalConforme,
            totalDanificadas,

            qualidade:
                qualidade.toFixed(1),

            horasTrabalhadas:
                formatarHorasParaHHMM(
                    horasTrabalhadasDec
                ),

            horasParadas:
                formatarHorasParaHHMM(
                    horasParadasCartaoDec
                ),

            horasTotais:
                formatarHorasParaHHMM(
                    horasTotaisDec
                ),

            motivos:
                Object.entries(motivosMap)
                    .map(
                        ([name, value]) => ({
                            name,
                            value,

                            formattedValue:
                                formatarHorasParaHHMMSS(
                                    value
                                )
                        })
                    )
                    .sort(
                        (a, b) =>
                            b.value - a.value
                    )
        };
    }, [
        dados,
        tiposSelecionados
    ]);
};