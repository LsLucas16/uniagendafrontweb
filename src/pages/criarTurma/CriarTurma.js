import React, { useMemo, useRef, useState, useEffect } from "react";
import { Pencil, Upload, Search, X } from "lucide-react";
import Swal from "sweetalert2";
import data from "../../data/dados.json";
import EditarResponsavelModal from "../../components/EditarResponsavelModal/EditarResponsavelModal";
import "./CriarTurma.scss";

const STORAGE_TURMAS = "turmas_override";
const STORAGE_TURMA_ALUNOS = "turma_alunos_override";
const STORAGE_DISCIPLINA_ATUAL = "disciplinaAtualId";
const STORAGE_USUARIOS_DISCIPLINAS = "usuarios_disciplinas_override";

const defaultPerms = {
  eventos: true,
  responsaveis: false,
  alunos: true,
};

const CORES_TURMAS = [
  "#3B82F6",
  "#22C55E",
  "#A855F7",
  "#F59E0B",
  "#EF4444",
  "#14B8A6",
  "#8B5CF6",
  "#84CC16",
  "#06B6D4",
  "#EC4899",
  "#6366F1",
  "#F97316",
];

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
  window.dispatchEvent(new Event("turmas:changed"));
}

function getTurmaAlunosOverride() {
  return safeJsonParse(localStorage.getItem(STORAGE_TURMA_ALUNOS), {});
}

function setTurmaAlunosOverride(map) {
  localStorage.setItem(STORAGE_TURMA_ALUNOS, JSON.stringify(map));
  window.dispatchEvent(new Event("turmas:changed"));
}

function getUsuariosDisciplinasOverride() {
  return safeJsonParse(localStorage.getItem(STORAGE_USUARIOS_DISCIPLINAS), {});
}

function setUsuariosDisciplinasOverride(map) {
  localStorage.setItem(STORAGE_USUARIOS_DISCIPLINAS, JSON.stringify(map));
  window.dispatchEvent(new Event("turmas:changed"));
}

function buildNomeCompleto(nome = "", complemento = "") {
  const n = String(nome || "").trim();
  const c = String(complemento || "").trim();

  if (!n && !c) return "";
  if (!c) return n;
  return `${n} - ${c}`;
}

function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem("usuario")) || null;
  } catch {
    return null;
  }
}

function getNextDisciplinaId(baseDisciplinas, turmasOverride) {
  const idsBase = (baseDisciplinas || []).map((d) => Number(d.id) || 0);
  const idsOverride = Object.keys(turmasOverride || {}).map(
    (id) => Number(id) || 0,
  );
  const maxId = Math.max(0, ...idsBase, ...idsOverride);
  return maxId + 1;
}

function getRandomTurmaColor() {
  const idx = Math.floor(Math.random() * CORES_TURMAS.length);
  return CORES_TURMAS[idx];
}

function addDisciplinaParaUsuario(
  overrideMap,
  userId,
  disciplinaId,
  baseUsuarios,
) {
  if (!userId || !disciplinaId) return overrideMap;

  const key = String(userId);
  const baseUser = (baseUsuarios || []).find(
    (u) => Number(u.id) === Number(userId),
  );
  const baseDisciplinas = Array.isArray(baseUser?.disciplinas)
    ? baseUser.disciplinas
    : [];
  const overrideDisciplinas = Array.isArray(overrideMap[key])
    ? overrideMap[key]
    : [];

  const merged = [
    ...new Set([
      ...baseDisciplinas,
      ...overrideDisciplinas,
      Number(disciplinaId),
    ]),
  ];

  return {
    ...overrideMap,
    [key]: merged,
  };
}

export default function CriarTurma() {
  const [nome, setNome] = useState("");
  const [complemento, setComplemento] = useState("");
  const [tipo, setTipo] = useState("primaria");

  const [responsaveis, setResponsaveis] = useState(() => {
    const usuario = getUsuarioLogado();
    const baseUsuarios = Array.isArray(data?.usuarios) ? data.usuarios : [];

    const user =
      baseUsuarios.find((u) => Number(u.id) === Number(usuario?.id)) || null;

    const responsavelPadrao = buildResponsavelPadrao(user);
    return responsavelPadrao ? [responsavelPadrao] : [];
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editIndex, setEditIndex] = useState(null);

  const [buscaAluno, setBuscaAluno] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState(null);
  const [alunosSelecionados, setAlunosSelecionados] = useState([]);

  const searchWrapRef = useRef(null);

  const usuarioLogado = useMemo(() => getUsuarioLogado(), []);
  const baseUsuarios = Array.isArray(data?.usuarios) ? data.usuarios : [];
  const baseDisciplinas = Array.isArray(data?.disciplinas)
    ? data.disciplinas
    : [];

  const usuariosComUser = useMemo(() => {
    return baseUsuarios.map((u) => ({
      ...u,
      user: u.user ?? String(u.id).padStart(9, "0"),
    }));
  }, [baseUsuarios]);

  const user = useMemo(() => {
    const id = usuarioLogado?.id;
    if (!id) return null;
    return baseUsuarios.find((u) => Number(u.id) === Number(id)) || null;
  }, [usuarioLogado, baseUsuarios]);

  const instituicaoIdAtual = user?.faculdadeId || 1;

  const candidatosBusca = useMemo(() => {
    const q = buscaAluno.trim().toLowerCase();
    if (!q) return [];

    return baseUsuarios
      .filter((u) => u.tipo === "aluno")
      .filter((u) => Number(u.faculdadeId) === Number(instituicaoIdAtual))
      .filter(
        (u) =>
          u.nome?.toLowerCase().includes(q) ||
          String(u.user || "")
            .toLowerCase()
            .includes(q) ||
          String(u.id).includes(q) ||
          String(u.email || "")
            .toLowerCase()
            .includes(q),
      )
      .filter(
        (u) => !alunosSelecionados.some((a) => Number(a.id) === Number(u.id)),
      )
      .slice(0, 8)
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        matricula: u.user,
        email: u.email || "",
      }));
  }, [buscaAluno, baseUsuarios, alunosSelecionados, instituicaoIdAtual]);

  useEffect(() => {
    if (!user) return;

    setResponsaveis((prev) => {
      const jaExiste = prev.some(
        (r) => Number(r.userId) === Number(user.id) && r.coordenadorPadrao,
      );

      if (jaExiste) return prev;

      const responsavelPadrao = buildResponsavelPadrao(user);
      return responsavelPadrao ? [responsavelPadrao, ...prev] : prev;
    });
  }, [user]);

  useEffect(() => {
    const onDown = (e) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const responsavelPrincipal = responsaveis[0] || {
    nome: "",
    cargo: "",
    contato: "",
  };

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

  const handleSaveResponsavelFromModal = (payload) => {
    const currentItem =
      modalMode === "edit" && editIndex !== null
        ? responsaveis[editIndex]
        : null;

    const normalized = {
      userId: payload.userId ?? currentItem?.userId ?? "",
      nome: payload.nome ?? "",
      cargo: payload.cargo ?? "",
      contato: payload.contato ?? "",
      permissoes: { ...defaultPerms, ...(payload.permissoes || {}) },
      fixo: currentItem?.fixo ?? false,
      coordenadorPadrao: currentItem?.coordenadorPadrao ?? false,
    };

    if (modalMode === "add") {
      setResponsaveis((prev) => [...prev, normalized]);
      closeModal();
      return;
    }

    if (editIndex === null) return;

    setResponsaveis((prev) => {
      const next = [...prev];
      next[editIndex] = { ...next[editIndex], ...normalized };
      return next;
    });

    closeModal();
  };

  const handleRemoveResponsavelFromModal = () => {
    if (editIndex === null) return;

    const responsavelAtual = responsaveis[editIndex];
    if (responsavelAtual?.coordenadorPadrao || responsavelAtual?.fixo) {
      Swal.fire({
        icon: "warning",
        title: "Remoção não permitida",
        text: "O coordenador padrão da turma pode ser editado, mas não pode ser removido.",
      });
      return;
    }

    setResponsaveis((prev) => prev.filter((_, i) => i !== editIndex));
    closeModal();
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

    const aluno = baseUsuarios.find(
      (u) => Number(u.id) === Number(alunoSelecionadoId),
    );
    if (!aluno) return;

    setAlunosSelecionados((prev) => [
      ...prev,
      {
        id: aluno.id,
        nome: aluno.nome,
        matricula: aluno.user,
        email: aluno.email || "",
      },
    ]);

    setBuscaAluno("");
    setAlunoSelecionadoId(null);
    setDropdownOpen(false);
  };

  const handleRemoverAluno = (id) => {
    setAlunosSelecionados((prev) =>
      prev.filter((a) => Number(a.id) !== Number(id)),
    );
  };

  const limparFormulario = () => {
    setNome("");
    setComplemento("");
    setTipo("primaria");

    const responsavelPadrao = buildResponsavelPadrao(user);
    setResponsaveis(responsavelPadrao ? [responsavelPadrao] : []);

    setBuscaAluno("");
    setDropdownOpen(false);
    setAlunoSelecionadoId(null);
    setAlunosSelecionados([]);
  };

  const handleCriarTurma = () => {
    if (!nome.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Informe o nome",
        text: "O nome da turma é obrigatório.",
      });
      return;
    }

    const turmasOverride = getTurmasOverride();
    const turmaAlunosOverride = getTurmaAlunosOverride();
    let usuariosDisciplinasOverride = getUsuariosDisciplinasOverride();

    const novoId = getNextDisciplinaId(baseDisciplinas, turmasOverride);
    const nomeCompleto = buildNomeCompleto(nome, complemento);
    const corAleatoria = getRandomTurmaColor();

    const professorSelecionado =
      responsaveis.find((r) => String(r.cargo).toLowerCase() === "professor") ||
      null;

    const responsavelSelecionado =
      responsaveis.find(
        (r) => String(r.cargo).toLowerCase() === "responsável",
      ) ||
      responsaveis.find(
        (r) => String(r.cargo).toLowerCase() === "responsavel",
      ) ||
      null;

    const coordenadores = responsaveis.filter(
  (r) => String(r.cargo).toLowerCase() === "coordenador",
);

const professores = responsaveis.filter(
  (r) => String(r.cargo).toLowerCase() === "professor",
);

const responsaveisLegais = responsaveis.filter((r) => {
  const cargo = String(r.cargo).toLowerCase();
  return cargo === "responsável" || cargo === "responsavel";
});

turmasOverride[String(novoId)] = {
  id: novoId,
  nome: nomeCompleto,
  nomeCustom: String(nome || "").trim(),
  complementoCustom: String(complemento || "").trim(),
  tipo,
  cor: corAleatoria,
  instituicaoId: instituicaoIdAtual,

  professorId: professorSelecionado
    ? Number(professorSelecionado.userId) || null
    : null,
  responsavelId: responsavelSelecionado
    ? Number(responsavelSelecionado.userId) || null
    : null,

  professorIds: professores.map((r) => Number(r.userId)).filter(Boolean),
  responsavelIds: responsaveisLegais
    .map((r) => Number(r.userId))
    .filter(Boolean),
  coordenadorIds: coordenadores.map((r) => Number(r.userId)).filter(Boolean),
  alunoIds: alunosSelecionados.map((a) => Number(a.id)).filter(Boolean),

  criado_por: coordenadores.length
    ? Number(coordenadores[0].userId) || null
    : usuarioLogado?.id
      ? Number(usuarioLogado.id)
      : null,

  responsaveis: responsaveis.map((r) => ({
    userId: r.userId ?? "",
    usuarioId: Number(r.userId) || null,
    nome: r.nome ?? "",
    cargo: r.cargo ?? "",
    contato: r.contato ?? "",
    permissoes: { ...defaultPerms, ...(r.permissoes || {}) },
    fixo: !!r.fixo,
    removivel: r.fixo ? false : true,
    coordenadorPadrao: !!r.coordenadorPadrao,
    criadoPorTurma: !!r.coordenadorPadrao,
  })),

  criadaNoCriarTurma: true,
  criadaEm: new Date().toISOString(),
};

    turmaAlunosOverride[String(novoId)] = alunosSelecionados.map((a) =>
      Number(a.id),
    );

    if (usuarioLogado?.id) {
      usuariosDisciplinasOverride = addDisciplinaParaUsuario(
        usuariosDisciplinasOverride,
        Number(usuarioLogado.id),
        novoId,
        baseUsuarios,
      );
    }

    responsaveis.forEach((r) => {
      if (!r?.userId) return;
      usuariosDisciplinasOverride = addDisciplinaParaUsuario(
        usuariosDisciplinasOverride,
        Number(r.userId),
        novoId,
        baseUsuarios,
      );
    });

    alunosSelecionados.forEach((a) => {
      usuariosDisciplinasOverride = addDisciplinaParaUsuario(
        usuariosDisciplinasOverride,
        Number(a.id),
        novoId,
        baseUsuarios,
      );
    });

    setTurmasOverride(turmasOverride);
    setTurmaAlunosOverride(turmaAlunosOverride);
    setUsuariosDisciplinasOverride(usuariosDisciplinasOverride);

    localStorage.setItem(STORAGE_DISCIPLINA_ATUAL, String(novoId));
    window.dispatchEvent(new Event("disciplinaAtual:changed"));

    Swal.fire({
      icon: "success",
      title: "Turma criada",
      text: "A turma foi criada com sucesso.",
      timer: 1400,
      showConfirmButton: false,
    });

    limparFormulario();
  };

  const podeCriarTurma =
    nome.trim() && responsaveis.length > 0 && alunosSelecionados.length > 0;

  function buildResponsavelPadrao(user) {
    if (!user) return null;

    return {
      userId: user.id ?? "",
      nome: user.nome ?? "",
      cargo: "Coordenador",
      contato: user.email || user.telefone || "",
      permissoes: { ...defaultPerms },
      fixo: true,
      coordenadorPadrao: true,
    };
  }

  return (
    <div className="painel-evento criar-turma-page">
      <div className="eventos-wrap">
        <section className="criar-turma-card criar-turma-card--top">
          <h1 className="page-title">Criar Nova Turma</h1>
          <h2 className="section-title">Informações da Turma</h2>

          <div className="grid-2">
            <div className="field">
              <label>Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder=""
              />
            </div>

            <div className="field">
              <label>Complemento</label>
              <input
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Ex: Turma 8"
              />
            </div>
          </div>

          <div className="tipo-area">
            <div className="tipo-label">Selecione o tipo</div>

            <div className="radio-group">
              <label className="radio-item">
                <input
                  type="radio"
                  name="tipoTurma"
                  checked={tipo === "primaria"}
                  onChange={() => setTipo("primaria")}
                />
                <span>Primária</span>
              </label>

              <label className="radio-item">
                <input
                  type="radio"
                  name="tipoTurma"
                  checked={tipo === "secundaria"}
                  onChange={() => setTipo("secundaria")}
                />
                <span>Secundária</span>
              </label>
            </div>
          </div>
        </section>

        <section className="criar-turma-card">
          <h2 className="section-title">Responsáveis da turma</h2>

          <div className="responsaveis">
            {responsaveis.length > 0 ? (
  responsaveis.map((r, idx) => (
    <div
      className="responsavel-card"
      key={`${r.userId}-${idx}-${r.nome}`}
    >
      <div className="responsavel-top">
        <span className="chip">{r.nome || "Responsável"}</span>

        <button
          type="button"
          className="btn-edit"
          onClick={() => openEditarResponsavel(idx)}
        >
          <Pencil size={12} />
          <span className="btn-edit__text">Editar</span>
        </button>
      </div>

      <div className="grid-2 inner">
        <div className="field">
          <label>Cargo</label>
          <input
            value={r.cargo || ""}
            readOnly
          />
        </div>

        <div className="field">
          <label>Contato</label>
          <input
            value={r.contato || ""}
            readOnly
          />
        </div>
      </div>
    </div>
  ))
) : (
  <div className="empty-state">
    <p>Nenhum responsável adicionado ainda.</p>
    <p>
      Use o botão abaixo para buscar e adicionar o primeiro
      responsável.
    </p>
  </div>
)}

            <button
              type="button"
              className="btn-primary wide add-responsavel-btn"
              onClick={openAdicionarResponsavel}
            >
              Adicionar Responsável
            </button>
          </div>
        </section>

        <section className="criar-turma-card alunos-card">
          <div className="section-head">
            <h2 className="section-title">Lista de alunos</h2>

            <button
              type="button"
              className="btn-import"
              onClick={() =>
                Swal.fire("Info", "Função de importação (mock).", "info")
              }
            >
              <Upload size={13} />
              <span>Importar lista</span>
            </button>
          </div>

          <div className="search-wrap" ref={searchWrapRef}>
            <Search size={15} className="search-ico" />

            <input
              value={buscaAluno}
              onChange={(e) => {
                setBuscaAluno(e.target.value);
                setAlunoSelecionadoId(null);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                if (candidatosBusca.length > 0) setDropdownOpen(true);
              }}
              className="search-input"
              placeholder="Busque por nome, matrícula, e-mail..."
            />

            {dropdownOpen && candidatosBusca.length > 0 && (
              <div className="search-dropdown">
                {candidatosBusca.map((c) => (
                  <button
                    key={String(c.id)}
                    type="button"
                    className={`dropdown-item ${
                      Number(alunoSelecionadoId) === Number(c.id)
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setAlunoSelecionadoId(c.id);
                      setBuscaAluno(`${c.nome} (${c.matricula || ""})`);
                      setDropdownOpen(false);
                    }}
                  >
                    <div className="d-name">{c.nome}</div>
                    <div className="d-sub">{c.matricula || c.email || ""}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {alunoSelecionadoId && (
            <div className="add-aluno-row">
              <button
                type="button"
                className="btn-primary add-aluno-btn"
                onClick={handleAdicionarAluno}
              >
                Adicionar aluno
              </button>
            </div>
          )}

          {alunosSelecionados.length > 0 ? (
            <div className="alunos-list">
              {alunosSelecionados.map((a) => (
                <div className="aluno-row" key={a.id}>
                  <div className="aluno-info">
                    <div className="aluno-nome">{a.nome}</div>
                    <div className="aluno-matricula">
                      {a.matricula || a.email || ""}
                    </div>
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
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhum aluno adicionado ainda.</p>
              <p>Busque alunos ou importe uma lista.</p>
            </div>
          )}

          <div className="footer-action">
            <button
              type="button"
              className={`btn-create ${podeCriarTurma ? "is-ready" : ""}`}
              onClick={handleCriarTurma}
            >
              Criar turma
            </button>
          </div>
        </section>

        <EditarResponsavelModal
          open={modalOpen}
          onClose={closeModal}
          usuarios={usuariosComUser}
          initialValue={
            modalMode === "edit" && editIndex !== null
              ? responsaveis[editIndex]
              : null
          }
          onSave={handleSaveResponsavelFromModal}
          onRemove={
            modalMode === "edit" &&
            editIndex !== null &&
            !responsaveis[editIndex]?.coordenadorPadrao &&
            !responsaveis[editIndex]?.fixo
              ? handleRemoveResponsavelFromModal
              : null
          }
          bloquearResponsavel={
            modalMode === "edit" &&
            editIndex !== null &&
            !!responsaveis[editIndex]?.coordenadorPadrao
          }
          bloquearRemocao={
            modalMode === "edit" &&
            editIndex !== null &&
            !!responsaveis[editIndex]?.coordenadorPadrao
          }
        />
      </div>
    </div>
  );
}
