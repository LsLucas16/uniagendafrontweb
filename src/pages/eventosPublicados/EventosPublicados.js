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

export default function EventosPublicados() {
  const [usuarioLogado, setUsuarioLogado] = useState(() => getUsuarioLogado());
  const navigate = useNavigate();
  const [disciplinaAtualId, setDisciplinaAtualId] = useState(() =>
    getDisciplinaAtualId(),
  );

  // 🔹 força re-render quando criar/editar/excluir
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onDisciplinaChanged = () =>
      setDisciplinaAtualId(getDisciplinaAtualId());

    const onStorage = (e) => {
      if (e.key === "usuario") setUsuarioLogado(getUsuarioLogado());
      if (e.key === "disciplinaAtualId")
        setDisciplinaAtualId(getDisciplinaAtualId());
      // não confie em storage event para mesma aba
    };

    // ✅ evento interno disparado pelo app quando eventos mudarem
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

  const user = useMemo(() => {
    const id = usuarioLogado?.id;
    if (!id) return null;
    return (data.usuarios || []).find((u) => u.id === id) || null;
  }, [usuarioLogado]);

  const eventosFiltrados = useMemo(() => {
    if (!user) return [];

    const instId = user.faculdadeId;
    const discIdNum = disciplinaAtualId ? Number(disciplinaAtualId) : null;

    // ✅ pega lista final (base + overrides do localStorage)
    const baseEventos = Array.isArray(data.eventos) ? data.eventos : [];
    const eventosFinal = getEventos(baseEventos);

    const lista = eventosFinal
      .filter((ev) => ev.instituicaoId === instId)
      .filter((ev) => {
        if (!discIdNum) return true;
        return ev.disciplinaId === discIdNum;
      })
      .sort((a, b) => {
        const ta = new Date(a.ultimaAtualizacao || 0).getTime();
        const tb = new Date(b.ultimaAtualizacao || 0).getTime();
        return tb - ta;
      });

    return lista;
  }, [user, disciplinaAtualId, refreshKey]); // ✅ refreshKey garante atualização na mesma aba

  const handleEditar = (eventoId) => {
    navigate(`/eventos/${eventoId}/editar`);
  };

  if (!user) {
    return (
      <div className="painel-evento">
        <div className="card-form">
          <header className="eventos-publicados-header">
            <h1>Eventos Publicados</h1>
            <p>Consulte, gerencie e acompanhe todos os eventos já publicados</p>
          </header>

          <div className="eventos-publicados-list">
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

            return (
              <article key={ev.id} className="evento-card">
                <div className="evento-card-top">
                  <div className="evento-card-titleblock">
                    <div className="evento-card-title">{ev.titulo}</div>

                    {temDataEvento ? (
                      <div className="evento-card-eventdate">
                        Data do evento: {dataEventoFmt}
                      </div>
                    ) : (
                      <div className="evento-card-updated">
                        Última atualização: {dataAtual}
                      </div>
                    )}

                    <div
                      className={`evento-card-chips ${
                        temCalendario && temDestaque
                          ? "evento-card-chips--duo"
                          : ""
                      }`}
                    >
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

                <div className="evento-card-desc">{ev.descricao}</div>

                <div className="evento-card-footer">
                  <span className="evento-card-createdby">
                    Criado por: <strong>{criadoPor}</strong>
                  </span>

                  {temDataEvento && (
                    <span className="evento-card-footer-updated">
                      Última atualização: {dataAtual}
                    </span>
                  )}
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
      </div>
    </div>
  );
}
