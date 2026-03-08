import React, { useMemo, useState } from "react";
import { Search, Pencil, Trash2, Users, X, Check } from "lucide-react";
import dados from "../../data/dados.json";
import "./EditarTurmaCoordenador.scss";
import { useNavigate } from "react-router-dom";

const STORAGE_TURMAS = "turmas_override";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function getTurmasOverride() {
  return safeJsonParse(localStorage.getItem(STORAGE_TURMAS), {});
}

function saveTurmasOverride(next) {
  localStorage.setItem(STORAGE_TURMAS, JSON.stringify(next));
  window.dispatchEvent(new Event("turmas:changed"));
}

function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem("usuario")) || null;
  } catch {
    return null;
  }
}

function normStr(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export default function EditarTurmaCoordenador() {
  const [busca, setBusca] = useState("");
  const [overrideVersion, setOverrideVersion] = useState(0);

  const [editingId, setEditingId] = useState(null);
  const [editingNome, setEditingNome] = useState("");
  const navigate = useNavigate();

  const usuario = useMemo(() => getUsuarioLogado(), []);
  const overrides = useMemo(() => getTurmasOverride(), [overrideVersion]);

  const usuarioCompleto = useMemo(() => {
    if (!usuario?.id) return null;
    return dados.usuarios.find((u) => u.id === usuario.id) || null;
  }, [usuario]);

  const turmasDaCoordenacao = useMemo(() => {
    if (!usuarioCompleto) return [];

    const idsDoUsuario = Array.isArray(usuarioCompleto.disciplinas)
      ? usuarioCompleto.disciplinas
      : [];

    return (dados.disciplinas || [])
      .filter((disc) => disc.instituicaoId === usuarioCompleto.faculdadeId)
      .filter((disc) => idsDoUsuario.includes(disc.id))
      .map((disc) => {
        const ov = overrides[String(disc.id)] || {};
        const professor =
          dados.usuarios.find((u) => u.id === disc.professorId) || null;

        const alunos = (dados.usuarios || []).filter(
          (u) =>
            u.tipo === "aluno" &&
            u.faculdadeId === disc.instituicaoId &&
            Array.isArray(u.disciplinas) &&
            u.disciplinas.includes(disc.id),
        );

        return {
          ...disc,
          ...ov,
          professor,
          alunosCount: alunos.length,
        };
      })
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  }, [usuarioCompleto, overrides]);

  const turmasFiltradas = useMemo(() => {
    const termo = normStr(busca);

    if (!termo) return turmasDaCoordenacao;

    return turmasDaCoordenacao.filter((turma) => {
      const nome = normStr(turma.nome);
      const professor = normStr(turma.professor?.nome);
      return nome.includes(termo) || professor.includes(termo);
    });
  }, [busca, turmasDaCoordenacao]);

  function handleStartEdit(turma) {
    setEditingId(turma.id);
    setEditingNome(String(turma.nome || ""));
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditingNome("");
  }

  function handleSaveEdit(turmaId) {
    const nomeFinal = editingNome.trim();
    if (!nomeFinal) return;

    const current = getTurmasOverride();
    const prev = current[String(turmaId)] || {};

    const next = {
      ...current,
      [String(turmaId)]: {
        ...prev,
        nome: nomeFinal,
      },
    };

    saveTurmasOverride(next);
    setOverrideVersion((v) => v + 1);
    handleCancelEdit();
  }

  function handleRemoveOverride(turmaId) {
    const current = getTurmasOverride();
    const next = { ...current };

    delete next[String(turmaId)];

    saveTurmasOverride(next);
    setOverrideVersion((v) => v + 1);

    if (editingId === turmaId) {
      handleCancelEdit();
    }
  }

  return (
    <div className="editar-turmas-coord">
      <div className="editar-turmas-coord__card">
        <header className="editar-turmas-coord__header">
          <h1>Editar Turmas</h1>
          <p>Visualize, edite ou exclua turmas existentes.</p>
        </header>

        <div className="editar-turmas-coord__search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, disciplina ou professor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="editar-turmas-coord__list">
          {turmasFiltradas.length === 0 ? (
            <div className="editar-turmas-coord__empty">
              Nenhuma turma encontrada.
            </div>
          ) : (
            turmasFiltradas.map((turma) => {
              const isEditing = editingId === turma.id;

              return (
                <article
                  key={turma.id}
                  className="editar-turmas-coord__item"
                  style={{ "--barColor": turma.cor || "#60a5fa" }}
                >
                  <div className="editar-turmas-coord__bar" />

                  <div className="editar-turmas-coord__content">
                    <div className="editar-turmas-coord__main">
                      {!isEditing ? (
                        <h2 className="editar-turmas-coord__title">
                          {turma.nome}
                        </h2>
                      ) : (
                        <div className="editar-turmas-coord__editbox">
                          <input
                            type="text"
                            value={editingNome}
                            onChange={(e) => setEditingNome(e.target.value)}
                            maxLength={80}
                            autoFocus
                          />
                          <div className="editar-turmas-coord__edit-actions-mobile">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(turma.id)}
                              aria-label="Salvar"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              aria-label="Cancelar"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="editar-turmas-coord__meta">
                        {turma.professor?.nome && (
                          <span>
                            <strong>Professor:</strong> {turma.professor.nome}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="editar-turmas-coord__right">
                      <div className="editar-turmas-coord__students">
                        <Users size={17} />
                        <span>{turma.alunosCount} alunos</span>
                      </div>

                      {!isEditing ? (
                        <div className="editar-turmas-coord__actions">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/editar-turma/${turma.id}`)
                            }
                            aria-label="Editar turma"
                            title="Editar turma"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveOverride(turma.id)}
                            aria-label="Remover alterações"
                            title="Remover alterações"
                            className="is-danger"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="editar-turmas-coord__actions editar-turmas-coord__actions--edit">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(turma.id)}
                            aria-label="Salvar"
                            title="Salvar"
                          >
                            <Check size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            aria-label="Cancelar"
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
