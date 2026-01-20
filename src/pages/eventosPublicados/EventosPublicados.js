import React, { useEffect, useMemo, useState } from "react";
import "./EventosPublicados.scss";

const API_BASE = "http://localhost:3001"; // json-server

function formatarDataPtBR(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("pt-BR");
}

function getUsuarioLogadoFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("usuario")) || null;
  } catch {
    return null;
  }
}

function getDisciplinaAtualFromStorage() {
  return localStorage.getItem("disciplinaAtualId") || "";
}

export default function EventosPublicados() {
  const [loading, setLoading] = useState(true);

  const [eventos, setEventos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);

  const [usuarioLogado, setUsuarioLogado] = useState(() =>
    getUsuarioLogadoFromStorage()
  );
  const [disciplinaAtualId, setDisciplinaAtualId] = useState(() =>
    getDisciplinaAtualFromStorage()
  );

  // Ouve mudanças disparadas pelo MenuLateral
  useEffect(() => {
    const onDisciplinaChanged = () => {
      setDisciplinaAtualId(getDisciplinaAtualFromStorage());
    };

    const onStorageChanged = (e) => {
      if (e.key === "usuario") setUsuarioLogado(getUsuarioLogadoFromStorage());
      if (e.key === "disciplinaAtualId")
        setDisciplinaAtualId(getDisciplinaAtualFromStorage());
    };

    window.addEventListener("disciplinaAtual:changed", onDisciplinaChanged);
    window.addEventListener("storage", onStorageChanged);

    return () => {
      window.removeEventListener("disciplinaAtual:changed", onDisciplinaChanged);
      window.removeEventListener("storage", onStorageChanged);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const [resEventos, resUsuarios, resDisciplinas] = await Promise.all([
          fetch(`${API_BASE}/eventos`),
          fetch(`${API_BASE}/usuarios`),
          fetch(`${API_BASE}/disciplinas`),
        ]);

        const [dataEventos, dataUsuarios, dataDisciplinas] = await Promise.all([
          resEventos.json(),
          resUsuarios.json(),
          resDisciplinas.json(),
        ]);

        if (!alive) return;

        // Ordena por ultimaAtualizacao desc
        const ordenado = [...(dataEventos || [])].sort((a, b) => {
          const ta = new Date(a.ultimaAtualizacao || 0).getTime();
          const tb = new Date(b.ultimaAtualizacao || 0).getTime();
          return tb - ta;
        });

        setEventos(ordenado);
        setUsuarios(dataUsuarios || []);
        setDisciplinas(dataDisciplinas || []);
      } catch {
        if (!alive) return;
        setEventos([]);
        setUsuarios([]);
        setDisciplinas([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const usuariosById = useMemo(() => {
    const map = new Map();
    for (const u of usuarios) map.set(u.id, u);
    return map;
  }, [usuarios]);

  const disciplinasById = useMemo(() => {
    const map = new Map();
    for (const d of disciplinas) map.set(String(d.id), d);
    return map;
  }, [disciplinas]);

  const instituicaoIdLogada = usuarioLogado?.faculdadeId ?? null;

  const tituloDisciplinaAtual = useMemo(() => {
    if (!disciplinaAtualId) return "";
    return disciplinasById.get(String(disciplinaAtualId))?.nome || "";
  }, [disciplinaAtualId, disciplinasById]);

  const eventosFiltrados = useMemo(() => {
    if (!usuarioLogado) return [];
    if (!instituicaoIdLogada) return [];

    const discIdNum = disciplinaAtualId ? Number(disciplinaAtualId) : null;

    return eventos
      .filter((ev) => ev.instituicaoId === instituicaoIdLogada)
      .filter((ev) => {
        // Se não tiver disciplina selecionada (edge), mostra tudo da instituição
        if (!discIdNum) return true;
        return ev.disciplinaId === discIdNum;
      });
  }, [eventos, usuarioLogado, instituicaoIdLogada, disciplinaAtualId]);

  const handleEditar = (eventoId) => {
    window.location.href = `/eventos/${eventoId}/editar`;
  };

  if (!usuarioLogado) {
    return (
      <div className="eventos-publicados-page">
        <div className="eventos-publicados-container">
          <header className="eventos-publicados-header">
            <h1>Eventos Publicados</h1>
            <p>Consulte, gerencie e acompanhe todos os eventos já publicados</p>
          </header>
          <div className="eventos-publicados-loading">
            Usuário não identificado. Faça login novamente.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="eventos-publicados-page">
      <div className="eventos-publicados-container">
        <header className="eventos-publicados-header">
          <h1>Eventos Publicados</h1>
          <p>Consulte, gerencie e acompanhe todos os eventos já publicados</p>

          {/* (Opcional) linha discreta mostrando o contexto atual */}
          {!!tituloDisciplinaAtual && (
            <div className="eventos-publicados-contexto">
              Turma atual: <strong>{tituloDisciplinaAtual}</strong>
            </div>
          )}
        </header>

        {loading ? (
          <div className="eventos-publicados-loading">Carregando...</div>
        ) : (
          <div className="eventos-publicados-list">
            {eventosFiltrados.map((ev) => {
              const criadoPor = usuariosById.get(ev.criadoPorId)?.nome || "—";
              const data = formatarDataPtBR(ev.ultimaAtualizacao);

              const podeEditar = !!ev.calendario; // REGRA: só calendário (inclui ambos)
              const temCalendario = !!ev.calendario;
              const temDestaque = !!ev.destaque;

              return (
                <article key={ev.id} className="evento-card">
                  <div className="evento-card-top">
                    <div className="evento-card-titleblock">
                      <div className="evento-card-title">{ev.titulo}</div>
                      <div className="evento-card-updated">
                        Última atualização: {data}
                      </div>

                      <div className="evento-card-chips">
                        {temCalendario && (
                          <span className="chip chip--calendario">
                            Calendário
                          </span>
                        )}
                        {temDestaque && (
                          <span className="chip chip--destaque">Destaque</span>
                        )}
                      </div>
                    </div>

                    {/* Botão só se for calendário */}
                    {podeEditar && (
                      <button
                        type="button"
                        className="btn-editar"
                        onClick={() => handleEditar(ev.id)}
                        aria-label={`Editar ${ev.titulo}`}
                      >
                        <span className="btn-editar-icon" aria-hidden="true">
                          ✎
                        </span>
                        Editar
                      </button>
                    )}
                  </div>

                  <div className="evento-card-desc">{ev.descricao}</div>

                  <div className="evento-card-footer">
                    <span className="evento-card-createdby">
                      Criado por: <strong>{criadoPor}</strong>
                    </span>
                  </div>
                </article>
              );
            })}

            {!eventosFiltrados.length && (
              <div className="eventos-publicados-empty">
                Nenhum evento publicado para a turma selecionada.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
