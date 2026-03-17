import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./MenuLateral.scss";
import {
  SquarePen,
  ClipboardList,
  Settings,
  LogOut,
  Plus,
  Calendar,
  ChevronRight,
} from "lucide-react";

import {
  getUsuarioLogado,
  getInstituicaoById,
  getDisciplinasPermitidas,
  getUsuariosMesclados,
  setDisciplinaAtual,
} from "../../utils/storageData";

const MenuLateral = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [perfilAberto, setPerfilAberto] = useState(false);
  const [disciplinaAbertaId, setDisciplinaAbertaId] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [disciplinaAtualId, setDisciplinaAtualId] = useState(
    () => localStorage.getItem("disciplinaAtualId") || ""
  );

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const bump = () => setDataVersion((v) => v + 1);

    const syncDisciplinaAtual = () => {
      setDisciplinaAtualId(localStorage.getItem("disciplinaAtualId") || "");
    };

    const onStorage = (e) => {
      if (!e.key) {
        bump();
        syncDisciplinaAtual();
        return;
      }

      if (
        e.key === "usuarios_override" ||
        e.key === "turmas_override" ||
        e.key === "usuarios_disciplinas_override" ||
        e.key === "eventos_override" ||
        e.key === "usuario"
      ) {
        bump();
      }

      if (e.key === "disciplinaAtualId") {
        syncDisciplinaAtual();
      }
    };

    window.addEventListener("app:data-changed", bump);
    window.addEventListener("disciplinaAtual:changed", syncDisciplinaAtual);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("app:data-changed", bump);
      window.removeEventListener("disciplinaAtual:changed", syncDisciplinaAtual);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const user = useMemo(() => getUsuarioLogado(), [dataVersion]);

  const instituicao = useMemo(() => {
    if (!user) return null;
    return getInstituicaoById(user.faculdadeId);
  }, [user]);

  const usuariosMesclados = useMemo(() => getUsuariosMesclados(), [dataVersion]);

  const getUsuarioById = (id) =>
    usuariosMesclados.find((u) => Number(u.id) === Number(id)) || null;

  const normalizarIds = (ids, idAntigo) => {
    if (Array.isArray(ids)) {
      return ids.map(Number).filter(Boolean);
    }

    if (idAntigo !== undefined && idAntigo !== null && idAntigo !== "") {
      return [Number(idAntigo)].filter(Boolean);
    }

    return [];
  };

  const disciplinasDoUsuario = useMemo(() => {
    if (!user) return [];

    const disciplinas = getDisciplinasPermitidas(user) || [];

    return disciplinas.sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
    );
  }, [user, dataVersion]);

  useEffect(() => {
    if (!disciplinasDoUsuario.length) {
      setDisciplinaAtualId("");
      localStorage.removeItem("disciplinaAtualId");
      window.dispatchEvent(new Event("disciplinaAtual:changed"));
      return;
    }

    const existeNaLista = disciplinasDoUsuario.some(
      (d) => String(d.id) === String(disciplinaAtualId)
    );

    if (!disciplinaAtualId || !existeNaLista) {
      const firstId = String(disciplinasDoUsuario[0].id);
      setDisciplinaAtualId(firstId);
      localStorage.setItem("disciplinaAtualId", firstId);
      window.dispatchEvent(new Event("disciplinaAtual:changed"));
    }
  }, [disciplinaAtualId, disciplinasDoUsuario]);

  if (!user) return null;

  const primeiraLetra = String(user.nome || "").trim().charAt(0).toUpperCase();
  const isAluno = user.tipo === "aluno";
  const isCoordenador = user.tipo === "coordenador";

  const handleLogout = (e) => {
    e.stopPropagation();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  const isEditarTurmaAtivo =
    location.pathname === "/editar-turma" ||
    location.pathname === "/editar-turma-coordenador" ||
    location.pathname.startsWith("/editar-turma/");

  return (
    <aside className="menuLateral">
      <header
        className={`menuLateral__header ${perfilAberto ? "active" : ""}`}
        onClick={() => setPerfilAberto((prev) => !prev)}
      >
        <div className="menuLateral__avatar">{primeiraLetra}</div>

        {!perfilAberto ? (
          <div className="menuLateral__brand">
            <span>UniAgenda - Sua rotina acadêmica sob controle!</span>
          </div>
        ) : (
          <>
            <div className="menuLateral__user-details">
              <strong className="menuLateral__user-title">{user.nome}</strong>

              {user?.user && (
                <span className="menuLateral__user-sub">{user.user}</span>
              )}

              {user?.login && (
                <span className="menuLateral__user-sub">{user.login}</span>
              )}
            </div>

            <button
              type="button"
              className="menuLateral__btn-sair"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </>
        )}
      </header>

      {!perfilAberto && (
        <div className="menuLateral__uni-card">
          <div className="menuLateral__uni-logo">
            <img src={instituicao?.logo} alt="Logo" />
          </div>

          <div className="menuLateral__uni-info">
            <span className="menuLateral__uni-label">{instituicao?.nome}</span>
            <strong className="menuLateral__uni-name">
              {instituicao?.sigla}
            </strong>
          </div>
        </div>
      )}

      <hr className="menuLateral__divider" />

      <nav className="menuLateral__menu">
        <div className="menuLateral__actions">
          {!perfilAberto && !isAluno && (
            <div className="menuLateral__turmaBox">
              {!isCoordenador && (
                <span className="menuLateral__turmaLabel">Turma atual</span>
              )}

              <select
                className="menuLateral__turmaSelect"
                value={disciplinaAtualId}
                onChange={(e) => {
                  const next = e.target.value;
                  setDisciplinaAtualId(next);
                  setDisciplinaAtual(next);
                }}
              >
                {disciplinasDoUsuario.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {String(d.nome || "")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isAluno ? (
            <div className="menuLateral__materias">
              {disciplinasDoUsuario.map((disc) => {
                const open = disciplinaAbertaId === disc.id;

                const professorIds = normalizarIds(
                  disc.professorIds,
                  disc.professorId
                );

                const responsavelIds = normalizarIds(
                  disc.responsavelIds,
                  disc.responsavelId
                );

                const alunoIds = normalizarIds(
                  disc.alunoIds,
                  disc.alunoId
                );

                const professores = professorIds
                  .map((id) => getUsuarioById(id))
                  .filter(Boolean);

                const responsaveis = responsavelIds
                  .map((id) => getUsuarioById(id))
                  .filter(Boolean);

                const alunos = alunoIds
                  .map((id) => getUsuarioById(id))
                  .filter(Boolean);

                const tituloCurto = String(disc.nome || "").split(" - ")[0];

                return (
                  <div key={disc.id} className="menuLateral__materiaWrap">
                    <button
                      type="button"
                      className={`menuLateral__materiaItem ${open ? "open" : ""}`}
                      onClick={() =>
                        setDisciplinaAbertaId(open ? null : disc.id)
                      }
                      style={{ "--discColor": disc.cor }}
                    >
                      <span className="menuLateral__dot" />
                      <span className="menuLateral__materiaTitle">
                        {tituloCurto}
                      </span>
                      <ChevronRight size={18} className="menuLateral__chev" />
                    </button>

                    {open && (
                      <div
                        className="menuLateral__materiaDetails"
                        style={{ "--discColor": disc.cor }}
                      >
                        <div className="menuLateral__detailsTitle">
                          {String(disc.nome || "")}
                        </div>

                        <div className="menuLateral__detailsLine">
                          <strong>Professores:</strong>{" "}
                          <span>
                            {professores.length
                              ? professores
                                  .map(
                                    (p) =>
                                      `${p.nome}${p.contato ? ` | ${p.contato}` : ""}`
                                  )
                                  .join(" • ")
                              : "—"}
                          </span>
                        </div>

                        <div className="menuLateral__detailsLine">
                          <strong>Responsáveis:</strong>{" "}
                          <span>
                            {responsaveis.length
                              ? responsaveis
                                  .map(
                                    (r) =>
                                      `${r.nome}${r.contato ? ` | ${r.contato}` : ""}`
                                  )
                                  .join(" • ")
                              : "—"}
                          </span>
                        </div>

                        <div className="menuLateral__detailsLine">
                          <strong>Alunos:</strong>{" "}
                          <span>
                            {alunos.length ? alunos.length : "—"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : isCoordenador ? (
            <>
              <button
                className={`menuLateral__btn ${isActive("/nova-turma") ? "active" : ""}`}
                onClick={() => navigate("/nova-turma")}
              >
                <Plus size={20} />
                <span>Novas Turmas</span>
              </button>

              <button
                className={`menuLateral__btn ${isActive("/criar-evento") ? "active" : ""}`}
                onClick={() => navigate("/criar-evento")}
              >
                <SquarePen size={20} />
                <span>Criar Eventos</span>
              </button>

              <button
                className={`menuLateral__btn ${isActive("/eventos") ? "active" : ""}`}
                onClick={() => navigate("/eventos")}
              >
                <ClipboardList size={20} />
                <span>Eventos Publicados</span>
              </button>

              <button
                className={`menuLateral__btn ${isEditarTurmaAtivo ? "active" : ""}`}
                onClick={() => navigate("/editar-turma-coordenador")}
              >
                <Settings size={20} />
                <span>Editar Turma</span>
              </button>

              <button
                className={`menuLateral__btn ${isActive("/ver-calendario") ? "active" : ""}`}
                onClick={() => navigate("/ver-calendario")}
              >
                <Calendar size={20} />
                <span>Ver Calendário</span>
              </button>
            </>
          ) : (
            <>
              <button
                className={`menuLateral__btn ${isActive("/criar-evento") ? "active" : ""}`}
                onClick={() => navigate("/criar-evento")}
              >
                <SquarePen size={20} />
                <span>Criar Eventos</span>
              </button>

              <button
                className={`menuLateral__btn ${isActive("/eventos") ? "active" : ""}`}
                onClick={() => navigate("/eventos")}
              >
                <ClipboardList size={20} />
                <span>Eventos Publicados</span>
              </button>

              <button
                className={`menuLateral__btn ${isEditarTurmaAtivo ? "active" : ""}`}
                onClick={() => navigate("/editar-turma")}
              >
                <Settings size={20} />
                <span>Editar Turma</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default MenuLateral;