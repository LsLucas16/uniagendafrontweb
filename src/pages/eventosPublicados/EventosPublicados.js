import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
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

export default function EventosPublicados() {
  const [usuarioLogado, setUsuarioLogado] = useState(() => getUsuarioLogado());
  const navigate = useNavigate();
  const [disciplinaAtualId, setDisciplinaAtualId] = useState(() =>
    getDisciplinaAtualId()
  );

  // 🔹 força re-render quando criar/editar/excluir
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ filtros UI
  const [apenasMeus, setApenasMeus] = useState(false);
  const [busca, setBusca] = useState("");

  // ✅ filtro de turmas (somente coordenador)
  const [turmaFiltroId, setTurmaFiltroId] = useState("all"); // "all" | "<id>"

  useEffect(() => {
    const onDisciplinaChanged = () => setDisciplinaAtualId(getDisciplinaAtualId());

    const onStorage = (e) => {
      if (e.key === "usuario") setUsuarioLogado(getUsuarioLogado());
      if (e.key === "disciplinaAtualId") setDisciplinaAtualId(getDisciplinaAtualId());
    };

    const onEventosChanged = () => setRefreshKey((k) => k + 1);

    window.addEventListener("disciplinaAtual:changed", onDisciplinaChanged);
    window.addEventListener("storage", onStorage);
    window.addEventListener("eventos:changed", onEventosChanged);

    return () => {
      window.removeEventListener("disciplinaAtual:changed", onDisciplinaChanged);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("eventos:changed", onEventosChanged);
    };
  }, []);

  const usuariosById = useMemo(() => {
    const map = new Map();
    (data.usuarios || []).forEach((u) => map.set(u.id, u));
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
    return (data.usuarios || []).find((u) => u.id === id) || null;
  }, [usuarioLogado]);

  const isCoordenador = useMemo(() => {
    return (user?.tipo || "").toLowerCase() === "coordenador";
  }, [user]);

  const turmasDisponiveis = useMemo(() => {
    if (!user) return [];
    if (!isCoordenador) return [];

    const instId = Number(user.faculdadeId);
    return (data.disciplinas || [])
      .filter((d) => Number(d?.instituicaoId) === instId)
      .map((d) => ({
        id: Number(d.id),
        nome:
          typeof d?.nome === "string" && d.nome.trim()
            ? d.nome
            : `Turma ${d?.id ?? ""}`,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [user, isCoordenador]);

  // ✅ garante que se mudar de usuário/instituição, filtro de turma não fique inválido
  useEffect(() => {
    if (!isCoordenador) return;
    if (turmaFiltroId === "all") return;
    const idNum = Number(turmaFiltroId);
    const ok = turmasDisponiveis.some((t) => Number(t.id) === idNum);
    if (!ok) setTurmaFiltroId("all");
  }, [isCoordenador, turmaFiltroId, turmasDisponiveis]);

  const eventosFiltrados = useMemo(() => {
    if (!user) return [];

    const instId = Number(user.faculdadeId);
    const discAtualNum = disciplinaAtualId ? Number(disciplinaAtualId) : null;

    const baseEventos = Array.isArray(data.eventos) ? data.eventos : [];
    const eventosFinal = getEventos(baseEventos);

    const q = normStr(busca);

    const lista = eventosFinal
      .filter((ev) => Number(ev.instituicaoId) === instId)
      .filter((ev) => {
        // ✅ toggle "apenas meus"
        if (apenasMeus) return Number(ev.criadoPorId) === Number(user.id);
        return true;
      })
      .filter((ev) => {
        // ✅ regra de visibilidade por turma:
        // - novo formato: ev.turmasIds (array)
        // - legado: usa ev.disciplinaId como "turma"
        const turmasEv = Array.isArray(ev.turmasIds) && ev.turmasIds.length > 0
          ? ev.turmasIds.map(Number).filter((x) => Number.isFinite(x))
          : [Number(ev.disciplinaId)].filter((x) => Number.isFinite(x));

        if (isCoordenador) {
          // coordenador: pode ver "Todas" ou filtrar por uma turma específica
          if (turmaFiltroId === "all") return true;
          const filtroNum = Number(turmaFiltroId);
          if (!filtroNum) return true;
          return turmasEv.includes(filtroNum);
        }

        // não coordenador: mantém o filtro de disciplina atual (turma atual)
        if (!discAtualNum) return true;
        return turmasEv.includes(discAtualNum);
      })
      .filter((ev) => {
        // ✅ busca (título, descrição, criador, turmas)
        if (!q) return true;

        const criadoPor = usuariosById.get(ev.criadoPorId)?.nome || "";
        const turmasEv = Array.isArray(ev.turmasIds) && ev.turmasIds.length > 0
          ? ev.turmasIds
          : [ev.disciplinaId];

        const nomesTurmas = (turmasEv || [])
          .map((id) => disciplinasById.get(Number(id))?.nome || "")
          .join(" ");

        const hay = normStr(
          `${ev.titulo} ${ev.descricao} ${criadoPor} ${nomesTurmas}`
        );

        return hay.includes(q);
      })
      .sort((a, b) => {
        const ta = new Date(a.ultimaAtualizacao || 0).getTime();
        const tb = new Date(b.ultimaAtualizacao || 0).getTime();
        return tb - ta;
      });

    return lista;
  }, [
    user,
    disciplinaAtualId,
    refreshKey,
    apenasMeus,
    busca,
    isCoordenador,
    turmaFiltroId,
    usuariosById,
    disciplinasById,
  ]);

  const handleEditar = (eventoId) => {
    navigate(`/eventos/${eventoId}/editar`);
  };

  if (!user) {
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

        {/* ✅ Filtros (igual sensação do print/figma) */}
        <section className="filtros-card">
          <div className="filtros-top">
            <div className="filtros-title">Filtros</div>

            <label className="switch-pill">
              <span className="switch-pill__label">Selecionar apenas meus eventos</span>
              <input
                type="checkbox"
                checked={apenasMeus}
                onChange={(e) => setApenasMeus(e.target.checked)}
              />
              <span className="switch-pill__track" aria-hidden="true">
                <span className="switch-pill__dot" />
              </span>
            </label>
          </div>

          <div className="filtros-row">
            <div className="filtro-search">
              <span className="filtro-search__icon" aria-hidden="true">⌕</span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, disciplina ou professor..."
              />
            </div>

            {isCoordenador && (
              <div className="filtro-select">
                <select
                  value={turmaFiltroId}
                  onChange={(e) => setTurmaFiltroId(e.target.value)}
                >
                  <option value="all">Todas as turmas</option>
                  {turmasDisponiveis.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.nome}
                    </option>
                  ))}
                </select>
                <span className="filtro-select__arrow" aria-hidden="true">▾</span>
              </div>
            )}
          </div>
        </section>

        {/* ✅ Lista */}
        <div className="eventos-publicados-list">
          {eventosFiltrados.map((ev) => {
            const criadoPor = usuariosById.get(ev.criadoPorId)?.nome || "—";
            const dataAtual = formatarDataPtBR(ev.ultimaAtualizacao);

            const temDataEvento = !!ev.dataEvento;
            const dataEventoFmt = temDataEvento ? formatarDataPtBR(ev.dataEvento) : "";

            const podeEditar = !!ev.calendario;
            const temCalendario = !!ev.calendario;
            const temDestaque = !!ev.destaque;

            // ✅ chips de turmas (coordenador enxerga multi-turma)
            const turmasEv = Array.isArray(ev.turmasIds) && ev.turmasIds.length > 0
              ? ev.turmasIds
              : [ev.disciplinaId];

            const turmasNomes = turmasEv
              .map((id) => ({
                id: Number(id),
                nome: disciplinasById.get(Number(id))?.nome || `Turma ${id}`,
              }))
              .filter((x) => x.nome);

            const MAX_CHIPS = 8;
            const chipsVisiveis = turmasNomes.slice(0, MAX_CHIPS);
            const chipsRestantes = turmasNomes.length - chipsVisiveis.length;

            return (
              <article key={ev.id} className="evento-card">
                <div className="evento-card-top">
                  <div className="evento-card-titleblock">
                    <div className="evento-card-createdbyline">
                      Criado por: <strong>{criadoPor}</strong>
                    </div>

                    <div className="evento-card-title">{ev.titulo}</div>

                    <div className="evento-card-desc">{ev.descricao}</div>

                    {/* chips de turmas */}
                    {isCoordenador && turmasNomes.length > 0 && (
                      <div className="evento-card-turmaschips">
                        {chipsVisiveis.map((t) => (
                          <span key={t.id} className="chip chip--turma">
                            {t.nome}
                          </span>
                        ))}
                        {chipsRestantes > 0 && (
                          <span className="chip chip--more">+ {chipsRestantes}</span>
                        )}
                      </div>
                    )}

                    <div className="evento-card-meta">
                      {temDataEvento ? (
                        <span>Data do evento: {dataEventoFmt}</span>
                      ) : (
                        <span>Última atualização: {dataAtual}</span>
                      )}

                      <div className="evento-card-chips">
                        {temCalendario && (
                          <span className="chip chip--calendario">Calendário</span>
                        )}
                        {temDestaque && (
                          <span className="chip chip--destaque">Destaque</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {podeEditar && (
                    <button
                      type="button"
                      className="btn-editar"
                      onClick={() => handleEditar(ev.id)}
                    >
                      <span className="btn-editar-icon" aria-hidden="true">
                        <Pencil size={14} />
                      </span>
                      Editar
                    </button>
                  )}
                </div>

                {temDataEvento && (
                  <div className="evento-card-footer">
                    <span className="evento-card-footer-updated">
                      Última atualização: {dataAtual}
                    </span>
                  </div>
                )}
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
