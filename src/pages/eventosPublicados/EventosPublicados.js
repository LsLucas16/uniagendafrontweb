// EventosPublicados.jsx
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

function getTurmasDoEvento(ev) {
  const fromTurmasIds =
    Array.isArray(ev?.turmasIds) && ev.turmasIds.length > 0
      ? ev.turmasIds
      : null;

  if (fromTurmasIds) {
    return fromTurmasIds.map(Number).filter((x) => Number.isFinite(x));
  }

  if (Array.isArray(ev?.disciplinaId)) {
    return ev.disciplinaId.map(Number).filter((x) => Number.isFinite(x));
  }

  const single = Number(ev?.disciplinaId);
  return Number.isFinite(single) ? [single] : [];
}

export default function EventosPublicados() {
  const [usuarioLogado, setUsuarioLogado] = useState(() => getUsuarioLogado());
  const navigate = useNavigate();
  const [disciplinaAtualId, setDisciplinaAtualId] = useState(() =>
    getDisciplinaAtualId(),
  );

  const [refreshKey, setRefreshKey] = useState(0);
  const [apenasMeus, setApenasMeus] = useState(false);
  const [busca, setBusca] = useState("");

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
    (data.usuarios || []).forEach((u) => map.set(u.id, u));
    return map;
  }, []);

  const disciplinasById = useMemo(() => {
    const map = new Map();
    (data.disciplinas || []).forEach((d) => map.set(Number(d.id), d));
    return map;
  }, []);

  // user “do JSON”
  const user = useMemo(() => {
    const id = usuarioLogado?.id;
    if (!id) return null;
    return (data.usuarios || []).find((u) => u.id === id) || null;
  }, [usuarioLogado]);

  // ✅ TIPO ROBUSTO (não depende só do JSON)
  const tipo = useMemo(() => {
    const raw =
      user?.tipo ??
      usuarioLogado?.tipo ??
      usuarioLogado?.cargo ??
      usuarioLogado?.perfil ??
      "";
    return String(raw).toLowerCase().trim();
  }, [user, usuarioLogado]);

  const isCoordenador = tipo === "coordenador";
  const isProfessor = tipo === "professor";
  const isResponsavel = tipo === "responsavel";

  // ✅ turmas do usuário (pra coordenador enxergar o que ele coordena)
  const userTurmasSet = useMemo(() => {
    const ids =
      (Array.isArray(user?.disciplinas) && user.disciplinas) ||
      (Array.isArray(usuarioLogado?.disciplinas) && usuarioLogado.disciplinas) ||
      [];
    return new Set(ids.map(Number).filter((x) => Number.isFinite(x)));
  }, [user, usuarioLogado]);

  const eventosFiltrados = useMemo(() => {
    if (!user && !usuarioLogado) return [];

    // inst vem do JSON, mas se não achar, tenta do storage
    const instId = Number(user?.faculdadeId ?? usuarioLogado?.faculdadeId);
    const discAtualNum = disciplinaAtualId ? Number(disciplinaAtualId) : null;

    const baseEventos = Array.isArray(data.eventos) ? data.eventos : [];
    const eventosFinal = getEventos(baseEventos);

    const q = normStr(busca);

    const lista = eventosFinal
      .filter((ev) => Number(ev.instituicaoId) === instId)
      .filter((ev) => {
        if (apenasMeus)
          return Number(ev.criadoPorId) === Number(user?.id ?? usuarioLogado?.id);
        return true;
      })
      .filter((ev) => {
        const turmasEv = getTurmasDoEvento(ev);

        // ✅ COORDENADOR: vê se criou OU se bate com QUALQUER turma dele
        if (isCoordenador) {
          const meuId = Number(user?.id ?? usuarioLogado?.id);
          const criou = Number(ev.criadoPorId) === meuId;
          if (criou) return true;

          // se não tiver turmas no perfil, não bloqueia
          if (!userTurmasSet || userTurmasSet.size === 0) return true;

          return turmasEv.some((id) => userTurmasSet.has(Number(id)));
        }

        // ✅ professor/responsável: só enxerga turma atual
        if (isProfessor || isResponsavel) {
          if (!discAtualNum) return true;
          return turmasEv.includes(discAtualNum);
        }

        if (!discAtualNum) return true;
        return turmasEv.includes(discAtualNum);
      })
      .filter((ev) => {
        if (!q) return true;

        const criadoPor = usuariosById.get(ev.criadoPorId)?.nome || "";
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
      });

    return lista;
  }, [
    user,
    usuarioLogado,
    disciplinaAtualId,
    refreshKey,
    apenasMeus,
    busca,
    isCoordenador,
    isProfessor,
    isResponsavel,
    usuariosById,
    disciplinasById,
    userTurmasSet,
  ]);

  const handleEditar = (eventoId) => {
    navigate(`/eventos/${eventoId}/editar`);
  };

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

        <section className="filtros-card">
          <div className="filtros-top">
            <div className="filtros-title">
              <span className="filtros-icon" aria-hidden="true">
                ⏷
              </span>
              Filtros
            </div>

            <button
              type="button"
              className={`filtros-pill ${apenasMeus ? "is-on" : ""}`}
              onClick={() => setApenasMeus((v) => !v)}
              aria-pressed={apenasMeus}
              title="Selecionar apenas meus eventos"
            >
              Selecionar apenas meus eventos
              <span className="filtros-pill-dot" aria-hidden="true" />
            </button>
          </div>

          <div className="filtros-row">
            <div className="filtro-search">
              <span className="filtro-search__icon" aria-hidden="true">
                ⌕
              </span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, disciplina ou professor..."
              />
            </div>
          </div>
        </section>

        <div className="eventos-publicados-list">
          {eventosFiltrados.map((ev) => {
            const criadoPor = usuariosById.get(ev.criadoPorId)?.nome || "—";
            const dataAtual = formatarDataPtBR(ev.ultimaAtualizacao);

            const temDataEvento = !!ev.dataEvento;
            const dataEventoFmt = temDataEvento
              ? formatarDataPtBR(ev.dataEvento)
              : "";

            const podeEditar = !!ev.calendario;
            const temCalendario = !!ev.calendario;
            const temDestaque = !!ev.destaque;

            const turmasEv = getTurmasDoEvento(ev);

            const turmasNomes = (turmasEv || []).map((id) => ({
              id: Number(id),
              nome: disciplinasById.get(Number(id))?.nome || `Turma ${id}`,
            }));

            // ✅ figma: aqui você pode controlar +N (coloque 9999 pra mostrar tudo)
            const MAX_TURMAS_CHIPS = 9999;
            const turmasOrdenadas = [...turmasNomes].sort((a, b) => a.id - b.id);
            const chipsVisiveis = turmasOrdenadas.slice(0, MAX_TURMAS_CHIPS);
            const restantes = turmasOrdenadas.length - chipsVisiveis.length;

            // ✅ agora depende de um tipo “robusto”
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
                          ? chipsVisiveis
                          : chipsVisiveis.slice(0, 1)
                        ).map((t) => (
                          <span key={t.id} className="chip chip--turma">
                            {t.nome}
                          </span>
                        ))}

                        {mostrarTodasTurmas && restantes > 0 && (
                          <span className="chip chip--more">+{restantes}</span>
                        )}
                      </div>
                    )}

                    <div className="evento-card-meta">
                      <div className="evento-card-dates">
                        {temDataEvento && (
                          <span>Data do evento: {dataEventoFmt}</span>
                        )}
                        <span>Última atualização: {dataAtual}</span>
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
