import { useMemo } from 'react';

/*
 * Converte valores numéricos do banco com segurança.
 * Aceita número e texto com vírgula decimal.
 */
const converterNumero = (valor) => {
    if (
        valor === null ||
        valor === undefined ||
        valor === ''
    ) {
        return 0;
    }

    if (typeof valor === 'number') {
        return Number.isFinite(valor)
            ? valor
            : 0;
    }

    const numero = Number.parseFloat(
        String(valor)
            .trim()
            .replace(',', '.')
    );

    return Number.isFinite(numero)
        ? numero
        : 0;
};

/*
 * Converte HH:MM:SS, HH:MM ou horas decimais
 * para horas decimais.
 *
 * O hook lê os dados já gravados no banco.
 * Portanto, um número como 2,5 representa
 * 2 horas e 30 minutos.
 */
const converterTempoParaHoras = (tempo) => {
    if (
        tempo === null ||
        tempo === undefined ||
        tempo === ''
    ) {
        return 0;
    }

    /*
     * Número armazenado diretamente como horas.
     */
    if (typeof tempo === 'number') {
        return Number.isFinite(tempo)
            ? Math.max(0, tempo)
            : 0;
    }

    const texto = String(tempo).trim();

    if (!texto) {
        return 0;
    }

    /*
     * Aceita:
     *
     * HH:MM
     * HH:MM:SS
     * HHH:MM:SS
     */
    const correspondencia = texto.match(
        /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/
    );

    if (correspondencia) {
        const horas =
            Number(correspondencia[1]);

        const minutos =
            Number(correspondencia[2]);

        const segundos =
            Number(correspondencia[3] || 0);

        /*
         * Impede durações inválidas,
         * como 02:75:90.
         */
        if (
            minutos >= 60 ||
            segundos >= 60
        ) {
            return 0;
        }

        return (
            horas +
            minutos / 60 +
            segundos / 3600
        );
    }

    /*
     * Número decimal em texto.
     *
     * Exemplo:
     * "2,5" = 2 horas e 30 minutos.
     */
    const numero = Number.parseFloat(
        texto.replace(',', '.')
    );

    return Number.isFinite(numero)
        ? Math.max(0, numero)
        : 0;
};

/*
 * Formata horas decimais em HH:MM:SS.
 */
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
        (
            segundosTotais % 3600
        ) / 60
    );

    const segundos =
        segundosTotais % 60;

    const horasFormatadas =
        horas.toLocaleString(
            'pt-BR'
        );

    return `${horasFormatadas}:${String(
        minutos
    ).padStart(2, '0')}:${String(
        segundos
    ).padStart(2, '0')}`;
};

/*
 * Formata horas decimais em HH:MM.
 */
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

    const horasFormatadas =
        horas.toLocaleString(
            'pt-BR'
        );

    return `${horasFormatadas}:${String(
        minutos
    ).padStart(2, '0')}`;
};

/*
 * Converte horas trabalhadas em
 * dias de 24 horas e horas restantes.
 */
const formatarDiasEHoras = (
    totalHoras
) => {
    if (
        !Number.isFinite(totalHoras) ||
        totalHoras <= 0
    ) {
        return '0d 00h';
    }

    const minutosTotais = Math.round(
        totalHoras * 60
    );

    const dias = Math.floor(
        minutosTotais /
        (
            24 * 60
        )
    );

    const minutosRestantes =
        minutosTotais %
        (
            24 * 60
        );

    const horasRestantes = Math.floor(
        minutosRestantes / 60
    );

    const diasFormatados =
        dias.toLocaleString(
            'pt-BR'
        );

    return `${diasFormatados}d ${String(
        horasRestantes
    ).padStart(2, '0')}h`;
};

/*
 * Normaliza textos para comparação.
 */
const normalizarTexto = (valor) => {
    return String(valor ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .replace(/\s+/g, ' ');
};

/*
 * Normaliza os valores de tipo.
 */
const normalizarTipo = (tipo) => {
    return normalizarTexto(tipo)
        .replace(/\s+/g, '');
};

/*
 * Verifica se o Tipo 3 está selecionado.
 */
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

        return Boolean(
            numeroEncontrado &&
            Number(
                numeroEncontrado[0]
            ) === 3
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
            Array.isArray(
                tiposSelecionados
            )
                ? tiposSelecionados
                : [tiposSelecionados];

        /*
         * O filtro de tipo é aplicado somente
         * ao gráfico de motivos.
         */
        const tiposSelecionadosSet =
            new Set(
                listaTiposSelecionados
                    .filter(
                        (tipo) =>
                            tipo !== null &&
                            tipo !== undefined &&
                            String(
                                tipo
                            ).trim() !== ''
                    )
                    .map(normalizarTipo)
            );

        const existeFiltroTipo =
            tiposSelecionadosSet.size > 0;

        /*
         * O Tipo 3 controla a inclusão de:
         *
         * - Final de Semana / sem expediente
         * - Feriado sem expediente
         * - Turno Reduzido
         *
         * no cartão Hora Parada.
         */
        const incluirParadasTipo3NoCartao =
            tipo3EstaSelecionado(
                listaTiposSelecionados
            );

        let totalConforme = 0;
        let totalDanificadas = 0;

        /*
         * Soma somente registros com
         * status Produzindo.
         */
        let horasTrabalhadasDec = 0;

        /*
         * Soma todas as paradas.
         */
        let horasParadasTotalDec = 0;

        /*
         * Soma apenas as paradas que estão
         * sendo exibidas no cartão.
         */
        let horasParadasCartaoDec = 0;

        const motivosMap = {};

        for (
            const registro of safeDados
        ) {
            totalConforme += converterNumero(
                registro.conforme
            );

            totalDanificadas += converterNumero(
                registro.danificada
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
             * Horas trabalhadas.
             */
            if (
                status === 'produzindo'
            ) {
                horasTrabalhadasDec +=
                    duracao;

                continue;
            }

            /*
             * Somente registros indisponíveis
             * entram como parada.
             */
            if (
                status !== 'indisponivel'
            ) {
                continue;
            }

            /*
             * Total geral de paradas.
             */
            horasParadasTotalDec +=
                duracao;

            const motivoNormalizado =
                normalizarTexto(
                    registro.motivo
                );

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
             * Paradas comuns entram sempre.
             */
            if (!ehParadaTipo3) {
                horasParadasCartaoDec +=
                    duracao;
            }

            /*
             * Paradas especiais entram apenas
             * quando o Tipo 3 estiver selecionado.
             */
            if (
                ehParadaTipo3 &&
                incluirParadasTipo3NoCartao
            ) {
                horasParadasCartaoDec +=
                    duracao;
            }

            /*
             * Filtro de tipo somente no gráfico.
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
                String(
                    registro.motivo ?? ''
                ).trim() !== ''
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
         * TOTAL DE HORAS DINÂMICO
         *
         * Usa exatamente:
         *
         * Horas Trabalhadas +
         * Hora Parada exibida no cartão.
         *
         * Quando o Tipo 3 for marcado,
         * as paradas especiais entram no total.
         *
         * Quando o Tipo 3 não estiver marcado,
         * elas não entram no total.
         */
        const horasTotaisDec =
            horasTrabalhadasDec +
            horasParadasCartaoDec;

        return {
            totalConforme,

            totalDanificadas,

            qualidade:
                qualidade.toFixed(1),

            /*
             * Horas trabalhadas.
             */
            horasTrabalhadas:
                formatarHorasParaHHMM(
                    horasTrabalhadasDec
                ),

            horasTrabalhadasComSegundos:
                formatarHorasParaHHMMSS(
                    horasTrabalhadasDec
                ),

            horasTrabalhadasDec,

            /*
             * Dias trabalhados.
             */
            diasTrabalhados:
                formatarDiasEHoras(
                    horasTrabalhadasDec
                ),

            diasTrabalhadosDec:
                (
                    horasTrabalhadasDec /
                    24
                ).toFixed(2),

            /*
             * Hora parada dinâmica.
             */
            horasParadas:
                formatarHorasParaHHMM(
                    horasParadasCartaoDec
                ),

            horasParadasComSegundos:
                formatarHorasParaHHMMSS(
                    horasParadasCartaoDec
                ),

            horasParadasDec:
                horasParadasCartaoDec,

            /*
             * Dias parados.
             */
            diasParados:
                formatarDiasEHoras(
                    horasParadasCartaoDec
                ),

            diasParadosDec:
                (
                    horasParadasCartaoDec /
                    24
                ).toFixed(2),

            /*
             * Todas as paradas.
             * Mantido para conferência.
             */
            horasParadasTotal:
                formatarHorasParaHHMM(
                    horasParadasTotalDec
                ),

            horasParadasTotalComSegundos:
                formatarHorasParaHHMMSS(
                    horasParadasTotalDec
                ),

            horasParadasTotalDec,

            /*
             * Total de horas dinâmico.
             */
            horasTotais:
                formatarHorasParaHHMM(
                    horasTotaisDec
                ),

            horasTotaisComSegundos:
                formatarHorasParaHHMMSS(
                    horasTotaisDec
                ),

            horasTotaisDec,

            /*
             * Dias totais.
             */
            diasTotais:
                formatarDiasEHoras(
                    horasTotaisDec
                ),

            diasTotaisDec:
                (
                    horasTotaisDec /
                    24
                ).toFixed(2),

            /*
             * Motivos de parada.
             */
            motivos:
                Object.entries(
                    motivosMap
                )
                    .map(
                        (
                            [name, value]
                        ) => ({
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
                            b.value -
                            a.value
                    )
        };
    }, [
        dados,
        tiposSelecionados
    ]);
};