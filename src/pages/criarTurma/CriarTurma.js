import React, { useMemo, useRef, useState, useEffect } from "react";
import { Pencil, Upload, Search, X } from "lucide-react";
import Swal from "sweetalert2";
import data from "../../data/dados.json";
import EditarResponsavelModal from "../../components/EditarResponsavelModal/EditarResponsavelModal";
import "./CriarTurma.scss";

const defaultPerms = {
  eventos: true,
  responsaveis: false,
  alunos: true,
};

export default function CriarTurma() {
  const [nome, setNome] = useState("");
  const [complemento, setComplemento] = useState("");
  const [tipo, setTipo] = useState("primaria");

  const [responsaveis, setResponsaveis] = useState([
    {
      userId: "",
      nome: "Márcia Alves",
      cargo: "",
      contato: "",
      permissoes: { ...defaultPerms },
    },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editIndex, setEditIndex] = useState(null);

  const [buscaAluno, setBuscaAluno] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState(null);
  const [alunosSelecionados, setAlunosSelecionados] = useState([]);

  const searchWrapRef = useRef(null);

  const baseUsuarios = Array.isArray(data?.usuarios) ? data.usuarios : [];

  const usuariosComUser = useMemo(() => {
    return baseUsuarios.map((u) => ({
      ...u,
      user: u.user ?? String(u.id).padStart(9, "0"),
    }));
  }, [baseUsuarios]);

  const candidatosBusca = useMemo(() => {
    const q = buscaAluno.trim().toLowerCase();
    if (!q) return [];

    return baseUsuarios
      .filter((u) => u.tipo === "aluno")
      .filter(
        (u) =>
          u.nome?.toLowerCase().includes(q) ||
          String(u.user || "").toLowerCase().includes(q) ||
          String(u.id).includes(q) ||
          String(u.email || "").toLowerCase().includes(q),
      )
      .filter((u) => !alunosSelecionados.some((a) => Number(a.id) === Number(u.id)))
      .slice(0, 8)
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        matricula: u.user,
        email: u.email || "",
      }));
  }, [buscaAluno, baseUsuarios, alunosSelecionados]);

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
    const normalized = {
      userId: payload.userId ?? "",
      nome: payload.nome ?? "",
      cargo: payload.cargo ?? "",
      contato: payload.contato ?? "",
      permissoes: { ...defaultPerms, ...(payload.permissoes || {}) },
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

    const aluno = baseUsuarios.find((u) => Number(u.id) === Number(alunoSelecionadoId));
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
    setAlunosSelecionados((prev) => prev.filter((a) => Number(a.id) !== Number(id)));
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

    Swal.fire({
      icon: "success",
      title: "Turma criada",
      text: "A turma foi criada com sucesso.",
      timer: 1400,
      showConfirmButton: false,
    });
  };

  return (
    <div className="criar-turma-page">
      <h1 className="page-title">Criar Nova Turma</h1>

      <section className="criar-turma-card">
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
          {responsaveis.map((r, idx) => (
            <div className="responsavel-card" key={`${r.userId}-${idx}-${r.nome}`}>
              <div className="responsavel-top">
                <span className="chip">{r.nome || "Responsável"}</span>

                <button
                  type="button"
                  className="btn-edit"
                  onClick={() => openEditarResponsavel(idx)}
                >
                  <Pencil size={14} />
                  <span className="btn-edit__text">Editar</span>
                </button>
              </div>

              {idx === 0 && (
                <div className="grid-2 inner">
                  <div className="field">
                    <label>Cargo</label>
                    <input value={responsavelPrincipal.cargo || ""} readOnly />
                  </div>

                  <div className="field">
                    <label>Contato</label>
                    <input value={responsavelPrincipal.contato || ""} readOnly />
                  </div>
                </div>
              )}
            </div>
          ))}

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
          <h2 className="section-title">Alunos da Turma</h2>

          <button
            type="button"
            className="btn-import"
            onClick={() => Swal.fire("Info", "Função de importação (mock).", "info")}
          >
            <Upload size={14} />
            <span>Importar lista</span>
          </button>
        </div>

        <div className="search-wrap" ref={searchWrapRef}>
          <Search size={16} className="search-ico" />

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
                    Number(alunoSelecionadoId) === Number(c.id) ? "active" : ""
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
                  <div className="aluno-matricula">{a.matricula || a.email || ""}</div>
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
            className="btn-create"
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
        onRemove={modalMode === "edit" ? handleRemoveResponsavelFromModal : null}
      />
    </div>
  );
}