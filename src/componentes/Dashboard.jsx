import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../Servicos/clienteSupabase';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import FiltrosDashboard from './FiltrosDashboard';
import { CheckCircle2, XCircle, Gauge, Clock, PauseCircle, Calculator, Target } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const [rawDados, setRawDados] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filtros, setFiltros] = useState({
        injetora: 'Todos',
        cod_prod: 'Todos',
        tipo: [],
        dataInicio: '',
        dataFim: ''
    });

    useEffect(() => {
        const fetchDados = async () => {
            setLoading(true);
            let todosOsDados = [];
            let pagina = 0;
            const tamanhoPagina = 1000;
            let continuar = true;

            try {
                while (continuar) {
                    const { data, error } = await supabase
                        .from('carga_maquina')
                        .select('*')
                        .range(pagina * tamanhoPagina, (pagina + 1) * tamanhoPagina - 1);

                    if (error) {
                        console.error("Erro ao carregar dados:", error);
                        break;
                    }

                    if (data && data.length > 0) {
                        todosOsDados = [...todosOsDados, ...data];
                        if (data.length < tamanhoPagina) {
                            continuar = false;
                        } else {
                            pagina++;
                        }
                    } else {
                        continuar = false;
                    }
                }

                setRawDados(todosOsDados);
            } catch (err) {
                console.error("Erro inesperado ao buscar dados:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDados();
    }, []);

    const tiposDisponiveis = useMemo(() => {
        return [...new Set(rawDados.map(d => d.tipo))].filter(t => t && t.toString().trim() !== '');
    }, [rawDados]);

    const produtosDisponiveis = useMemo(() => {
        const filtrado = filtros.injetora === 'Todos'
            ? rawDados
            : rawDados.filter(d => d.injetora === filtros.injetora);
        return [...new Set(filtrado.map(d => d.cod_prod))];
    }, [rawDados, filtros.injetora]);

    const dadosFiltrados = useMemo(() => {
        const inicioTs = filtros.dataInicio ? new Date(filtros.dataInicio).setHours(0, 0, 0, 0) : null;
        const fimTs = filtros.dataFim ? new Date(filtros.dataFim).setHours(23, 59, 59, 999) : null;
        const tiposSet = new Set(filtros.tipo);

        return rawDados.filter(item => {
            if (filtros.injetora !== 'Todos' && item.injetora !== filtros.injetora) return false;
            if (filtros.cod_prod !== 'Todos' && item.cod_prod !== filtros.cod_prod) return false;
            if (tiposSet.size > 0 && !tiposSet.has(item.tipo)) return false;

            if (inicioTs || fimTs) {
                const dataItemTs = new Date(item.inicio).getTime();
                if (inicioTs && dataItemTs < inicioTs) return false;
                if (fimTs && dataItemTs > fimTs) return false;
            }

            return true;
        });
    }, [rawDados, filtros]);

    const metrics = useDashboardMetrics(dadosFiltrados);

    if (loading) {
        return <div className="loading-spinner">Processando dados de produção...</div>;
    }

    return (
        <div className="dashboard-container">
            <aside className="sidebar">
                <button className="back-home-btn" onClick={() => navigate('/')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>Página Inicial</span>
                </button>

                <h2 className="brand-title">Pedrasplast</h2>

                {/* Componente de Filtros Reutilizável com a flag exibirMp={false} */}
                <FiltrosDashboard
                    filtros={filtros}
                    setFiltros={setFiltros}
                    tiposDisponiveis={tiposDisponiveis}
                    produtosDisponiveis={produtosDisponiveis}
                    rawDados={rawDados}
                    exibirMp={false}
                />
            </aside>

            <main className="main-content">
                <header className="dashboard-header"><h1>Dashboard de Produção</h1></header>
                <section className="kpi-grid">

                    <div className="kpi-card verde">
                        <CheckCircle2 size={24} color="#16a34a" />
                        <span>CONFORME</span>
                        <strong>{Number(metrics?.totalConforme || 0).toLocaleString('pt-BR')}</strong>
                    </div>

                    <div className="kpi-card vermelho">
                        <XCircle size={20} color="#dc2626" />
                        <span>DANIFICADAS</span>
                        <strong>{Number(metrics?.totalDanificadas || 0).toLocaleString('pt-BR')}</strong>
                    </div>

                    <div className="kpi-card verde">
                        <Target size={20} color="#3b82f6" />
                        <span>QUALIDADE</span>
                        <strong>{Number(metrics?.qualidade || 0).toFixed(2)} %</strong>
                    </div>

                    <div className="kpi-card verde">
                        <Clock size={20} color="#6b7280" />
                        <span>HORA TRABALHADA</span>
                        <strong>{metrics?.horasTrabalhadas || 0} hrs</strong>
                    </div>

                    <div className="kpi-card vermelho">
                        <PauseCircle size={20} color="#dc2626" />
                        <span>HORA PARADA</span>
                        <strong>{metrics?.horasParadas || 0} hrs</strong>
                    </div>

                    <div className="kpi-card verde">
                        <Calculator size={20} color="#6b7280" />
                        <span>TOTAL DE HORAS</span>
                        <strong>{metrics?.horasTotais || 0} hrs</strong>
                    </div>
                </section>

                <section className="chart-container">
                    <h3>MOTIVOS DE PARADA</h3>
                    <div className="motivos-list">
                        {(metrics?.motivos || []).map((item, i) => (
                            <div key={i} className="motivo-bar">
                                <div className="label-row">
                                    <span>{item.name}</span>
                                    <span>{item.formattedValue}</span>
                                </div>
                                <div className="progress-bg">
                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${metrics?.motivos?.length > 0 ? (item.value / (metrics.motivos[0].value * 1.01)) * 100 : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}