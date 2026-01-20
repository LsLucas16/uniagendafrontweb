import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EventosPublicados.scss";
import data from "../../api/dados.json";

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

  // escuta troca de disciplina feita no MenuLateral
  useEffect(() => {
    const onDisciplinaChanged = () =>
      setDisciplinaAtualId(getDisciplinaAtualId());

    // caso você altere usuário/disciplina em outra aba (não é obrigatório)
    const onStorage = (e) => {
      if (e.key === "usuario") setUsuarioLogado(getUsuarioLogado());
      if (e.key === "disciplinaAtualId")
        setDisciplinaAtualId(getDisciplinaAtualId());
    };

    window.addEventListener("disciplinaAtual:changed", onDisciplinaChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(
        "disciplinaAtual:changed",
        onDisciplinaChanged,
      );
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const usuariosById = useMemo(() => {
    const map = new Map();
    (data.usuarios || []).forEach((u) => map.set(u.id, u));
    return map;
  }, []);

  const disciplinasById = useMemo(() => {
    const map = new Map();
    (data.disciplinas || []).forEach((d) => map.set(String(d.id), d));
    return map;
  }, []);

  const user = useMemo(() => {
    const id = usuarioLogado?.id;
    if (!id) return null;
    return (data.usuarios || []).find((u) => u.id === id) || null;
  }, [usuarioLogado]);

  const instituicao = useMemo(() => {
    if (!user) return null;
    return (
      (data.instituicoes || []).find((i) => i.id === user.faculdadeId) || null
    );
  }, [user]);

  const tituloDisciplinaAtual = useMemo(() => {
    if (!disciplinaAtualId) return "";
    return disciplinasById.get(String(disciplinaAtualId))?.nome || "";
  }, [disciplinaAtualId, disciplinasById]);

  const eventosFiltrados = useMemo(() => {
    if (!user) return [];

    const instId = user.faculdadeId;
    const discIdNum = disciplinaAtualId ? Number(disciplinaAtualId) : null;

    const lista = (data.eventos || [])
      .filter((ev) => ev.instituicaoId === instId)
      .filter((ev) => {
        // se não tiver disciplina selecionada, mostra tudo da instituição
        if (!discIdNum) return true;
        return ev.disciplinaId === discIdNum;
      })
      .sort((a, b) => {
        const ta = new Date(a.ultimaAtualizacao || 0).getTime();
        const tb = new Date(b.ultimaAtualizacao || 0).getTime();
        return tb - ta;
      });

    return lista;
  }, [user, disciplinaAtualId]);

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
        </header>

        <div className="eventos-publicados-list">
          {eventosFiltrados.map((ev) => {
            const criadoPor = usuariosById.get(ev.criadoPorId)?.nome || "—";
            const dataAtual = formatarDataPtBR(ev.ultimaAtualizacao);

            const podeEditar = !!ev.calendario; // REGRA: só calendário (inclui ambos)
            const temCalendario = !!ev.calendario;
            const temDestaque = !!ev.destaque;

            return (
              <article key={ev.id} className="evento-card">
                <div className="evento-card-top">
                  <div className="evento-card-titleblock">
                    <div className="evento-card-title">{ev.titulo}</div>
                    <div className="evento-card-updated">
                      Última atualização: {dataAtual}
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
      </div>
    </div>
  );
}
