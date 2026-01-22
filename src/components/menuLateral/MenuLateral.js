import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./MenuLateral.scss";
import data from "../../data/dados.json";
import {
  SquarePen,
  ClipboardList,
  Settings,
  LogOut,
  Plus,
  Calendar,
  ChevronRight,
} from "lucide-react";

const MenuLateral = () => {
  // Hooks sempre no topo
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [disciplinaAbertaId, setDisciplinaAbertaId] = useState(null);
  const [disciplinaAtualId, setDisciplinaAtualId] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // pega do localStorage
  const usuarioStorage = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuario")) || null;
    } catch {
      return null;
    }
  }, []);

  const currentUserId = usuarioStorage?.id;

  const user = useMemo(() => {
    if (!currentUserId) return null;
    return data.usuarios.find((u) => u.id === currentUserId) || null;
  }, [currentUserId]);

  const instituicao = useMemo(() => {
    if (!user) return null;
    return data.instituicoes.find((i) => i.id === user.faculdadeId) || null;
  }, [user]);

  const disciplinasDoUsuario = useMemo(() => {
    if (!user) return [];
    const ids = Array.isArray(user.disciplinas) ? user.disciplinas : [];
    return (data.disciplinas || [])
      .filter((d) => ids.includes(d.id))
      .filter((d) => d.instituicaoId === user.faculdadeId);
  }, [user]);

  // Define disciplinaAtualId quando existir lista
  useEffect(() => {
    if (!disciplinaAtualId && disciplinasDoUsuario.length > 0) {
      const first = String(disciplinasDoUsuario[0].id);
      setDisciplinaAtualId(first);

      localStorage.setItem("disciplinaAtualId", first);
      window.dispatchEvent(new Event("disciplinaAtual:changed"));
    }
  }, [disciplinaAtualId, disciplinasDoUsuario]);

  const getUsuarioById = (id) => data.usuarios.find((u) => u.id === id);

  // Depois de TODOS os hooks, aí sim podemos "retornar null"
  if (!user) return null;

  const primeiraLetra = user.nome.trim().charAt(0).toUpperCase();
  const isAluno = user.tipo === "aluno";
  const isCoordenador = user.tipo === "coordenador";

  const handleLogout = (e) => {
    e.stopPropagation();
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <aside className="menuLateral">
      <header
        className={`menuLateral__header ${perfilAberto ? "active" : ""}`}
        onClick={() => setPerfilAberto(!perfilAberto)}
      >
        <div className="menuLateral__avatar">{primeiraLetra}</div>

        {!perfilAberto ? (
          <div className="menuLateral__brand">
            <span>UniAgenda - Sua rotina acadêmica sob controle!</span>
          </div>
        ) : (
          <div className="menuLateral__user-details">
            <strong>{user.nome}</strong>
            <span className="menuLateral__user-name">{user.user}</span>
            <span className="menuLateral__user-login">{user.login}</span>

            <button className="btn-sair" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
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
          {/* ✅ TURMA ATUAL (coordenador / professor / responsável) */}
          {!perfilAberto && !isAluno && (
            <div className="menuLateral__turmaBox">
              <span className="menuLateral__turmaLabel">Turma atual</span>

              <select
                className="menuLateral__turmaSelect"
                value={disciplinaAtualId}
                onChange={(e) => {
                  const next = e.target.value;
                  setDisciplinaAtualId(next);

                  // Persistência e broadcast para o restante do app
                  localStorage.setItem("disciplinaAtualId", next);
                  window.dispatchEvent(new Event("disciplinaAtual:changed"));
                }}
              >
                {disciplinasDoUsuario.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ===================== ALUNO ===================== */}
          {isAluno ? (
            <div className="menuLateral__materias">
              {disciplinasDoUsuario.map((disc) => {
                const open = disciplinaAbertaId === disc.id;
                const professor = getUsuarioById(disc.professorId);
                const responsavel = getUsuarioById(disc.responsavelId);
                const tituloCurto = disc.nome.split(" - ")[0];

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
                          {disc.nome}
                        </div>

                        <div className="menuLateral__detailsLine">
                          <strong>Professor:</strong>{" "}
                          <span>
                            {professor?.nome || "—"}
                            {professor?.contato
                              ? ` | ${professor.contato}`
                              : ""}
                          </span>
                        </div>

                        <div className="menuLateral__detailsLine">
                          <strong>Responsável:</strong>{" "}
                          <span>
                            {responsavel?.nome || "—"}
                            {responsavel?.contato
                              ? ` | ${responsavel.contato}`
                              : ""}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : /* ===================== COORDENADOR ===================== */
          isCoordenador ? (
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
                className={`menuLateral__btn ${isActive("/editar-turma") ? "active" : ""}`}
                onClick={() => navigate("/editar-turma")}
              >
                <Settings size={20} />
                <span>Editar Turmas</span>
              </button>

              <button
                className={`menuLateral__btn ${isActive("/calendario") ? "active" : ""}`}
                onClick={() => navigate("/calendario")}
              >
                <Calendar size={20} />
                <span>Ver Calendário</span>
              </button>
            </>
          ) : (
            /* ===================== PROFESSOR / RESPONSÁVEL ===================== */
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
                className={`menuLateral__btn ${isActive("/editar-turma") ? "active" : ""}`}
                onClick={() => navigate("/editar-turma")}
              >
                <Settings size={20} />
                <span>Editar Turmas</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default MenuLateral;
