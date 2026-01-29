import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Upload, Search, X } from "lucide-react";
import EditarResponsavelModal from "../../components/EditarResponsavelModal/EditarResponsavelModal";
import Swal from "sweetalert2";
import data from "../../data/dados.json";
import "./EditarTurma.scss";

const STORAGE_TURMAS = "turmas_override";
const STORAGE_TURMA_ALUNOS = "turma_alunos_override"; // { [disciplinaId]: number[] alunoIds }

const defaultPerms = {
  eventos: true,
  responsaveis: false,
  alunos: true,
};

function safeJsonParse(v, fallback) {
  try {
    return JSON.parse(v) ?? fallback;
  } catch {
    return fallback;
  }
}

function getTurmasOverride() {
  return safeJsonParse(localStorage.getItem(STORAGE_TURMAS), {});
}

function setTurmasOverride(map) {
  localStorage.setItem(STORAGE_TURMAS, JSON.stringify(map));
}

function getTurmaAlunosOverride() {
  return safeJsonParse(localStorage.getItem(STORAGE_TURMA_ALUNOS), {});
}

function setTurmaAlunosOverride(map) {
  localStorage.setItem(STORAGE_TURMA_ALUNOS, JSON.stringify(map));
}

function splitNomeComplemento(disciplinaNome = "") {
  const parts = String(disciplinaNome).split(" - ");
  if (parts.length >= 2) {
    return { nome: parts[0], complemento: parts.slice(1).join(" - ") };
  }
  return { nome: disciplinaNome, complemento: "" };
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

export default function EditarTurma() {
  const navigate = useNavigate();

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("edit"); // "edit" | "add"
  const [editIndex, setEditIndex] = useState(null); // number | null

  const openEditarResponsavel = (index) => {
    setModalMode("edit");
    setEditIndex(index);
    setModalOpen(true);
  };

  const openAdicionarResponsavel = () => {
    setModalMode("add");
    setEditIndex(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditIndex(null);
  };

  const [usuarioLogado, setUsuarioLogado] = useState(() => getUsuarioLogado());
  const [disciplinaAtualId, setDisciplinaAtualId] = useState(() =>
    getDisciplinaAtualId(),
  );

  useEffect(() => {
    const onDisciplinaChanged = () =>
      setDisciplinaAtualId(getDisciplinaAtualId());

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

  const turmaId = useMemo(() => {
    const n = disciplinaAtualId ? Number(disciplinaAtualId) : 0;
    return Number.isNaN(n) ? 0 : n;
  }, [disciplinaAtualId]);

  const baseDisciplinas = Array.isArray(data.disciplinas)
    ? data.disciplinas
    : [];
  const baseUsuarios = Array.isArray(data.usuarios) ? data.usuarios : [];

  const user = useMemo(() => {
    const id = usuarioLogado?.id;
    if (!id) return null;
    return baseUsuarios.find((u) => u.id === id) || null;
  }, [usuarioLogado, baseUsuarios]);

  const disciplinaBase = useMemo(() => {
    if (!turmaId) return null;
    return (
      baseDisciplinas.find((d) => Number(d.id) === Number(turmaId)) || null
    );
  }, [baseDisciplinas, turmaId]);

  const [loading, setLoading] = useState(true);

  // topo
  const [nome, setNome] = useState("");
  const [complemento, setComplemento] = useState("");

  // responsáveis: [{ userId, nome, cargo, contato, permissoes }]
  const [responsaveis, setResponsaveis] = useState([]);

  // alunos
  const [buscaAluno, setBuscaAluno] = useState("");
  const [alunosIds, setAlunosIds] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState(null);

  useEffect(() => {
    setLoading(true);

    if (!disciplinaBase) {
      setLoading(false);
      return;
    }

    const turmasOverride = getTurmasOverride();
    const turmaOverride = turmasOverride[String(turmaId)];

    const disciplinaMerged = {
      ...disciplinaBase,
      ...(turmaOverride || {}),
    };

    const { nome: n, complemento: c } = splitNomeComplemento(
      disciplinaMerged.nome || "",
    );
    setNome(disciplinaMerged.nomeCustom ?? n);
    setComplemento(disciplinaMerged.complementoCustom ?? c);

    // responsaveis base (professor + responsavel)
    const professor = baseUsuarios.find(
      (u) => Number(u.id) === Number(disciplinaMerged.professorId),
    );
    const responsavel = baseUsuarios.find(
      (u) => Number(u.id) === Number(disciplinaMerged.responsavelId),
    );

    const respOverride =
      turmaOverride && Array.isArray(turmaOverride.responsaveis)
        ? turmaOverride.responsaveis
        : null;

    const initialResponsaveis =
      respOverride ||
      [professor, responsavel].filter(Boolean).map((u) => ({
        userId: u.id,
        nome: u.nome,
        cargo:
          u.tipo === "professor"
            ? "Professor"
            : u.tipo === "responsavel"
              ? "Responsável"
              : "Coordenador",
        contato: u.contato || "",
        permissoes: {
          ...defaultPerms,
          ...(u.permissoes || {}),
        },
      }));

    // garante shape
    const normalized = initialResponsaveis.map((r) => ({
      userId: r.userId ?? "",
      nome: r.nome ?? "",
      cargo: r.cargo ?? "",
      contato: r.contato ?? "",
      permissoes: { ...defaultPerms, ...(r.permissoes || {}) },
    }));

    setResponsaveis(normalized);

    // alunos base
    const alunosBase = baseUsuarios
      .filter((u) => u.tipo === "aluno" && Array.isArray(u.disciplinas))
      .filter((u) => u.disciplinas.map(Number).includes(turmaId))
      .map((u) => u.id);

    const alunosOverrideMap = getTurmaAlunosOverride();
    const overrideIds = Array.isArray(alunosOverrideMap[String(turmaId)])
      ? alunosOverrideMap[String(turmaId)].map(Number)
      : null;

    setAlunosIds(overrideIds ?? alunosBase);

    setBuscaAluno("");
    setAlunoSelecionadoId(null);
    setLoading(false);
  }, [turmaId, disciplinaBase, baseUsuarios]);

  const alunosDetalhes = useMemo(() => {
    const mapUsuarios = new Map(baseUsuarios.map((u) => [Number(u.id), u]));
    return alunosIds
      .map((uid) => mapUsuarios.get(Number(uid)))
      .filter(Boolean)
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        matricula: String(u.id).padStart(9, "0"),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [alunosIds, baseUsuarios]);

  const candidatosBusca = useMemo(() => {
    const q = buscaAluno.trim().toLowerCase();
    if (!q) return [];

    const instituicaoId = disciplinaBase?.instituicaoId;

    const candidatos = baseUsuarios.filter((u) => u.tipo === "aluno");
    const filtrados = candidatos
      .filter((u) =>
        instituicaoId ? Number(u.faculdadeId) === Number(instituicaoId) : true,
      )
      .filter(
        (u) => u.nome?.toLowerCase().includes(q) || String(u.id).includes(q),
      )
      .slice(0, 8);

    return filtrados.map((u) => ({
      id: u.id,
      nome: u.nome,
      matricula: String(u.id).padStart(9, "0"),
    }));
  }, [buscaAluno, baseUsuarios, disciplinaBase]);

  function persistTurma(partial) {
    if (!turmaId) return;
    const map = getTurmasOverride();
    const prev = map[String(turmaId)] || {};
    map[String(turmaId)] = { ...prev, ...partial };
    setTurmasOverride(map);
  }

  function persistAlunos(nextIds) {
    if (!turmaId) return;
    const map = getTurmaAlunosOverride();
    map[String(turmaId)] = nextIds;
    setTurmaAlunosOverride(map);
  }

  const handleSalvarTopo = () => {
    persistTurma({
      nomeCustom: nome,
      complementoCustom: complemento,
    });

    Swal.fire({
      icon: "success",
      title: "Turma atualizada",
      text: "As informações foram salvas.",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const handleAdicionarAluno = () => {
    if (!alunoSelecionadoId) {
      Swal.fire({
        icon: "warning",
        title: "Selecione um aluno",
        text: "Busque e selecione um aluno antes de adicionar.",
      });
      return;
    }

    const next = Array.from(
      new Set([...alunosIds, Number(alunoSelecionadoId)]),
    );
    setAlunosIds(next);
    persistAlunos(next);

    setBuscaAluno("");
    setAlunoSelecionadoId(null);
  };

  const handleRemoverAluno = (uid) => {
    const next = alunosIds.filter((id) => Number(id) !== Number(uid));
    setAlunosIds(next);
    persistAlunos(next);
  };

  // modal payload -> sempre salva no storage
  const handleSaveResponsavelFromModal = (payload) => {
    // payload esperado do modal:
    // { userId, nome, cargo, contato, permissoes }
    const normalized = {
      userId: payload.userId ?? "",
      nome: payload.nome ?? "",
      cargo: payload.cargo ?? "",
      contato: payload.contato ?? "",
      permissoes: { ...defaultPerms, ...(payload.permissoes || {}) },
    };

    if (modalMode === "add") {
      const next = [...responsaveis, normalized];
      setResponsaveis(next);
      persistTurma({ responsaveis: next });
      closeModal();
      return;
    }

    // edit
    if (editIndex === null) return;
    const next = [...responsaveis];
    next[editIndex] = { ...next[editIndex], ...normalized };
    setResponsaveis(next);
    persistTurma({ responsaveis: next });
    closeModal();
  };

  const handleRemoveResponsavelFromModal = () => {
    if (editIndex === null) return;
    const next = responsaveis.filter((_, i) => i !== editIndex);
    setResponsaveis(next);
    persistTurma({ responsaveis: next });
    closeModal();
  };

  if (!user) {
    return (
      <div className="editar-turma-page">
        <div className="editar-turma-card">
          <header className="page-header">
            <h1>Editar Turma</h1>
          </header>

          <p className="empty-text">
            Usuário não identificado. Faça login novamente.
          </p>
          <button className="btn-secondary" onClick={() => navigate("/")}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!turmaId) {
    return (
      <div className="editar-turma-page">
        <div className="editar-turma-card">
          <header className="page-header">
            <h1>Editar Turma</h1>
          </header>

          <p className="empty-text">
            Nenhuma turma selecionada no menu lateral.
          </p>
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="editar-turma-page">
        <div className="editar-turma-card">
          <div className="skeleton-title" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      </div>
    );
  }

  if (!disciplinaBase) {
    return (
      <div className="editar-turma-page">
        <div className="editar-turma-card">
          <header className="page-header">
            <h1>Editar Turma</h1>
          </header>

          <p className="empty-text">Turma não encontrada.</p>
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="editar-turma-page">
      <div className="editar-turma-card">
        <header className="page-header">
          <h1>Editar Turma</h1>
        </header>

        <div className="grid-2">
          <div className="field">
            <label>Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={handleSalvarTopo}
              placeholder="Nome da turma"
            />
          </div>

          <div className="field">
            <label>Complemento</label>
            <input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              onBlur={handleSalvarTopo}
              placeholder="Ex.: Turma 8"
            />
          </div>
        </div>
        <div className="divider" />

        <div className="section">
          <h3 className="section-title">Responsáveis da turma</h3>

          <div className="responsaveis">
            {responsaveis.map((r, idx) => (
              <div className="responsavel-card" key={`${r.userId}-${idx}`}>
                <div className="responsavel-top">
                  <span className="chip">{r.nome}</span>

                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() => openEditarResponsavel(idx)}
                    aria-label="Editar responsável"
                    title="Editar"
                  >
                    <Pencil size={14} />
                    <span className="btn-edit__text">Editar</span>
                  </button>
                </div>

                <div className="grid-2 inner">
                  <div className="field">
                    <label>Cargo</label>
                    <input value={r.cargo || ""} readOnly />
                  </div>

                  <div className="field">
                    <label>Contato</label>
                    <input value={r.contato || ""} readOnly />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn-primary wide"
              onClick={openAdicionarResponsavel}
            >
              Adicionar Responsável
            </button>
        <div className="divider" />
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <h3 className="section-title">Lista de Alunos</h3>

            <button
              type="button"
              className="btn-primary small"
              onClick={() =>
                Swal.fire("Info", "Função de importação (mock).", "info")
              }
            >
              <Upload size={14} />
              <span>Importar lista</span>
            </button>
          </div>

          <div className="subsection">
            <div className="sub-title">Adicione alunos</div>

            <div className="search-wrap">
              <Search size={16} className="search-ico" />
              <input
                value={buscaAluno}
                onChange={(e) => {
                  setBuscaAluno(e.target.value);
                  setAlunoSelecionadoId(null);
                }}
                placeholder="Busque por nome, matricula..."
              />

              {candidatosBusca.length > 0 && (
                <div className="search-dropdown">
                  {candidatosBusca.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`dropdown-item ${
                        Number(alunoSelecionadoId) === Number(c.id)
                          ? "active"
                          : ""
                      }`}
                      onClick={() => setAlunoSelecionadoId(c.id)}
                    >
                      <div className="d-name">{c.nome}</div>
                      <div className="d-sub">{c.matricula}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="actions-row">
              <button
                type="button"
                className="btn-primary wide muted"
                onClick={handleAdicionarAluno}
              >
                Adicionar aluno
              </button>

              <button
                type="button"
                className="link"
                onClick={() =>
                  Swal.fire(
                    "Lista completa",
                    "Tela de lista completa (mock).",
                    "info",
                  )
                }
              >
                Ver lista completa de alunos
              </button>
            </div>

            <div className="alunos-list">
              {alunosDetalhes.map((a) => (
                <div className="aluno-row" key={a.id}>
                  <div className="aluno-info">
                    <div className="aluno-nome">{a.nome}</div>
                    <div className="aluno-matricula">{a.matricula}</div>
                  </div>

                  <button
                    type="button"
                    className="btn-x"
                    onClick={() => handleRemoverAluno(a.id)}
                    aria-label="Remover aluno"
                    title="Remover"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {!alunosDetalhes.length && (
                <div className="empty-small">Nenhum aluno adicionado.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditarResponsavelModal
        open={modalOpen}
        onClose={closeModal}
        usuarios={baseUsuarios}
        initialValue={
          modalMode === "edit" && editIndex !== null
            ? responsaveis[editIndex]
            : null
        }
        onSave={handleSaveResponsavelFromModal}
        onRemove={
          modalMode === "edit" ? handleRemoveResponsavelFromModal : null
        }
      />
    </div>
  );
}
