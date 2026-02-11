// EventosPublicados.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Search, Filter } from "lucide-react";
import "./EventosPublicados.scss";
import data from "../../data/dados.json";
import { getEventos } from "../../services/eventosStore";

function formatarDataPtBR(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("pt-BR");
}

function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem("usuario")) || null;
  } catch {
    return null;
  }
}

function getDisciplinaAtualId() {
  return localStorage.getItem("disciplinaAtualId") || "";
}

function normStr(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Pega as turmas/disciplinas associadas ao evento:
 * - turmasIds (novo)
 * - disciplinaId (pode ser number ou array)
 * - disciplinaCoordenadorId / disciplinacoordenadorId / disciplinCoordenadoraId / etc (chaves inconsistentes do JSON)
 */
function getTurmasDoEvento(ev) {
  const fromTurmasIds =
    Array.isArray(ev?.turmasIds) && ev.turmasIds.length > 0
      ? ev.turmasIds
      : null;

  if (fromTurmasIds) return fromTurmasIds.map(Number).filter(Number.isFinite);

  if (Array.isArray(ev?.disciplinaId)) {
    const arr = ev.disciplinaId.map(Number).filter(Number.isFinite);
    if (arr.length) return arr;
  }

  const candidates = [
    ev?.disciplinaCoordenadorId,
    ev?.disciplinacoordenadorId,
    ev?.disciplinCoordenadoraId,
    ev?.disciplinaCoordenadorID,
    ev?.disciplina_coordenador_id,
    ev?.disciplicoordenadornaId,
  ].filter((v) => v != null);

  for (const v of candidates) {
    if (Array.isArray(v)) {
      const arr = v.map(Number).filter(Number.isFinite);
      if (arr.length) return arr;
    } else {
      const single = Number(v);
      if (Number.isFinite(single)) return [single];
    }
  }

  const single = Number(ev?.disciplinaId);
  return Number.isFinite(single) ? [single] : [];
}

function getTipoUsuario(u) {
  const raw = u?.tipo ?? u?.cargo ?? u?.perfil ?? "";
  return String(raw).toLowerCase().trim();
}

export default function EventosPublicados() {
  const [usuarioLogado, setUsuarioLogado] = useState(() => getUsuarioLogado());
  const navigate = useNavigate();
  const [disciplinaAtualId, setDisciplinaAtualId] = useState(() =>
    getDisciplinaAtualId(),
  );

  const [refreshKey, setRefreshKey] = useState(0);

  // busca (mantive para todos)
  const [busca, setBusca] = useState("");

  // ✅ ÚNICO filtro do coordenador (toggle): false = mostra todos / true = só eventos criados por coordenadores
  const [apenasCoordenadores, setApenasCoordenadores] = useState(false);

  useEffect(() => {
    const onDisciplinaChanged = () =>
      setDisciplinaAtualId(getDisciplinaAtualId());

    const onStorage = (e) => {
      if (e.key === "usuario") setUsuarioLogado(getUsuarioLogado());
      if (e.key === "disciplinaAtualId")
        setDisciplinaAtualId(getDisciplinaAtualId());
    };

    const onEventosChanged = () => setRefreshKey((k) => k + 1);

    window.addEventListener("disciplinaAtual:changed", onDisciplinaChanged);
    window.addEventListener("storage", onStorage);
    window.addEventListener("eventos:changed", onEventosChanged);

    return () => {
      window.removeEventListener(
        "disciplinaAtual:changed",
        onDisciplinaChanged,
      );
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("eventos:changed", onEventosChanged);
    };
  }, []);

  const usuariosById = useMemo(() => {
    const map = new Map();
    (data.usuarios || []).forEach((u) => map.set(Number(u.id), u));
    return map;
  }, []);

  const disciplinasById = useMemo(() => {
    const map = new Map();
    (data.disciplinas || []).forEach((d) => map.set(Number(d.id), d));
    return map;
  }, []);

  const user = useMemo(() => {
    const id = usuarioLogado?.id;
    if (!id) return null;
    return (
      (data.usuarios || []).find((u) => Number(u.id) === Number(id)) || null
    );
  }, [usuarioLogado]);

  const tipo = useMemo(
    () => getTipoUsuario(user || usuarioLogado),
    [user, usuarioLogado],
  );

  const isCoordenador = tipo === "coordenador";
  const isProfessor = tipo === "professor";
  const isResponsavel = tipo === "responsavel";
  const isAluno = tipo === "aluno";

  const userTurmasSet = useMemo(() => {
    const ids =
      (Array.isArray(user?.disciplinas) && user.disciplinas) ||
      (Array.isArray(usuarioLogado?.disciplinas) &&
        usuarioLogado.disciplinas) ||
      [];
    return new Set(ids.map(Number).filter(Number.isFinite));
  }, [user, usuarioLogado]);

  // ✅ normaliza "coordenador" no evento baseado em quem criou (criadoPorId)
  function isEventoCriadoPorCoordenador(ev) {
    const criador = usuariosById.get(Number(ev?.criadoPorId));
    const t = getTipoUsuario(criador);
    return t === "coordenador";
  }

  const eventosFiltrados = useMemo(() => {
    if (!user && !usuarioLogado) return [];

    const instId = Number(user?.faculdadeId ?? usuarioLogado?.faculdadeId);
    const discAtualNum = disciplinaAtualId ? Number(disciplinaAtualId) : null;

    const baseEventos = Array.isArray(data.eventos) ? data.eventos : [];
    const eventosFinal = getEventos(baseEventos);

    const q = normStr(busca);

    return (
      eventosFinal
        .filter((ev) => Number(ev.instituicaoId) === instId)

        // ✅ ÚNICO filtro: apenas coordenadores (quando toggle ligado)
        .filter((ev) => {
          if (!isCoordenador) return true;
          if (!apenasCoordenadores) return true;
          return isEventoCriadoPorCoordenador(ev);
        })

        .filter((ev) => {
          const turmasEv = getTurmasDoEvento(ev);

          if (isCoordenador) {
            const meuId = Number(user?.id ?? usuarioLogado?.id);
            const criou = Number(ev.criadoPorId) === meuId;
            if (criou) return true;

            if (!userTurmasSet || userTurmasSet.size === 0) return true;

            return turmasEv.some((id) => userTurmasSet.has(Number(id)));
          }

          if (isProfessor || isResponsavel || isAluno) {
            if (!discAtualNum) return true;
            return turmasEv.includes(discAtualNum);
          }

          if (!discAtualNum) return true;
          return turmasEv.includes(discAtualNum);
        })

        .filter((ev) => {
          if (!q) return true;

          const criadoPor =
            usuariosById.get(Number(ev.criadoPorId))?.nome || "";
          const turmasEv = getTurmasDoEvento(ev);

          const nomesTurmas = (turmasEv || [])
            .map((id) => disciplinasById.get(Number(id))?.nome || `Turma ${id}`)
            .join(" ");

          const hay = normStr(
            `${ev.titulo} ${ev.descricao} ${criadoPor} ${nomesTurmas}`,
          );
          return hay.includes(q);
        })

        .sort((a, b) => {
          const ta = new Date(a.ultimaAtualizacao || 0).getTime();
          const tb = new Date(b.ultimaAtualizacao || 0).getTime();
          return tb - ta;
        })
    );
  }, [
    user,
    usuarioLogado,
    disciplinaAtualId,
    refreshKey,
    busca,
    isCoordenador,
    isProfessor,
    isResponsavel,
    isAluno,
    usuariosById,
    disciplinasById,
    userTurmasSet,
    apenasCoordenadores,
  ]);

  const handleEditar = (eventoId) => navigate(`/eventos/${eventoId}/editar`);

  if (!user && !usuarioLogado) {
    return (
      <div className="eventos-publicados-page">
        <div className="eventos-publicados-container">
          <header className="eventos-publicados-header">
            <h1>Eventos Publicados</h1>
            <p>Consulte, gerencie e acompanhe todos os eventos já publicados</p>
          </header>
          <div className="eventos-publicados-empty">
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
        </header>

        {/* ✅ Filtros só para coordenador */}
        {isCoordenador && (
          <section className="filtros-card">
            <div className="filtros-top">
              <div className="filtros-title">
                <Filter size={16} className="filtros-icon" aria-hidden="true" />
                Filtros
              </div>

              {/* ✅ UM ÚNICO BOTÃO (toggle) */}
              <button
                type="button"
                className={`filtros-pill ${apenasCoordenadores ? "is-on" : ""}`}
                onClick={() => setApenasCoordenadores((v) => !v)}
                aria-pressed={apenasCoordenadores}
                title="Apenas eventos criados por coordenadores"
              >
                Criado por coordenadores
                <span
                  className={`filtros-pill-dot ${apenasCoordenadores ? "is-filled" : "is-empty"}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="filtros-row">
              <div className="filtro-search">
                <Search
                  size={16}
                  className="filtro-search__icon"
                  aria-hidden="true"
                />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, disciplina ou professor..."
                />
              </div>
            </div>
          </section>
        )}

        {/* ✅ Para não-coordenador: NÃO mostra o card de filtros */}
        {!isCoordenador && (
          <div className="filtros-row only-search">
            <div className="filtro-search">
              <Search
                size={16}
                className="filtro-search__icon"
                aria-hidden="true"
              />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, disciplina ou professor..."
              />
            </div>
          </div>
        )}

        <div className="eventos-publicados-list">
          {eventosFiltrados.map((ev) => {
            const criadoPor =
              usuariosById.get(Number(ev.criadoPorId))?.nome || "—";
            const dataAtual = formatarDataPtBR(ev.ultimaAtualizacao);

            const temDataEvento = !!ev.dataEvento;
            const dataEventoFmt = temDataEvento
              ? formatarDataPtBR(ev.dataEvento)
              : "";

            const podeEditar = !!ev.calendario;
            const temCalendario = !!ev.calendario;
            const temDestaque = !!ev.destaque;

            const coordenador = isEventoCriadoPorCoordenador(ev);

            const turmasEv = getTurmasDoEvento(ev);
            const turmasNomes = (turmasEv || []).map((id) => ({
              id: Number(id),
              nome: disciplinasById.get(Number(id))?.nome || `Turma ${id}`,
            }));

            const turmasOrdenadas = [...turmasNomes].sort(
              (a, b) => a.id - b.id,
            );
            const mostrarTodasTurmas = isCoordenador;

            return (
              <article key={ev.id} className="evento-card">
                <div className="evento-card-top">
                  <div className="evento-card-titleblock">
                    <div className="evento-card-createdbyline">
                      Criado por: <strong>{criadoPor}</strong>
                    </div>

                    <div className="evento-card-title">{ev.titulo}</div>
                    <div className="evento-card-desc">{ev.descricao}</div>

                    {turmasOrdenadas.length > 0 && (
                      <div className="evento-card-turmaschips">
                        {(mostrarTodasTurmas
                          ? turmasOrdenadas
                          : turmasOrdenadas.slice(0, 1)
                        ).map((t) => (
                          <span key={t.id} className="chip chip--turma">
                            {t.nome}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="evento-card-meta">
                      <div className="evento-card-dates">
                        {temDataEvento && (
                          <span>Data do evento: {dataEventoFmt}</span>
                        )}

                        <div className="evento-card-lastline">
                          <span>Última atualização: {dataAtual}</span>

                          {(temCalendario || temDestaque) && (
                            <div className="evento-card-chips">
                              {temCalendario && (
                                <span className="chip chip--calendario">
                                  Calendário
                                </span>
                              )}
                              {temDestaque && (
                                <span className="chip chip--destaque">
                                  Destaque
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {podeEditar && (
                    <button
                      type="button"
                      className="btn-editar-icononly"
                      onClick={() => handleEditar(ev.id)}
                      aria-label="Editar evento"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {!eventosFiltrados.length && (
            <div className="eventos-publicados-empty">
              Nenhum evento publicado para o filtro selecionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
