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

const STORAGE_TURMAS = "turmas_override";

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

const MenuLateral = () => {
  // Hooks sempre no topo
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [disciplinaAbertaId, setDisciplinaAbertaId] = useState(null);
  const STORAGE_USUARIOS_DISCIPLINAS = "usuarios_disciplinas_override";

  const [disciplinaAtualId, setDisciplinaAtualId] = useState(() => {
    return localStorage.getItem("disciplinaAtualId") || "";
  });

  function getUsuariosDisciplinasOverride() {
  return safeJsonParse(localStorage.getItem(STORAGE_USUARIOS_DISCIPLINAS), {});
}

function getDisciplinasMescladas() {
  const overrides = getTurmasOverride();
  const base = Array.isArray(data.disciplinas) ? data.disciplinas : [];

  const baseMap = {};
  base.forEach((d) => {
    baseMap[String(d.id)] = d;
  });

  Object.entries(overrides).forEach(([id, ov]) => {
    baseMap[String(id)] = {
      ...(baseMap[String(id)] || {}),
      ...ov,
    };
  });

  return Object.values(baseMap);
}

  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const [turmasOverrideVer, setTurmasOverrideVer] = useState(0);

  useEffect(() => {
  const syncDisciplinaAtual = () => {
    setDisciplinaAtualId(localStorage.getItem("disciplinaAtualId") || "");
  };

  const onStorage = (e) => {
    if (e.key === "disciplinaAtualId") {
      syncDisciplinaAtual();
    }
  };

  window.addEventListener("disciplinaAtual:changed", syncDisciplinaAtual);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("disciplinaAtual:changed", syncDisciplinaAtual);
    window.removeEventListener("storage", onStorage);
  };
}, []);

  useEffect(() => {
    const bump = () => setTurmasOverrideVer((v) => v + 1);

    // evento interno que vamos disparar ao salvar na tela de editar
    window.addEventListener("turmas:changed", bump);

    // se mudar em outra aba/janela
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_TURMAS) bump();
    });

    return () => {
      window.removeEventListener("turmas:changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

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

  const usuariosDisciplinasOverride = getUsuariosDisciplinasOverride();
  const idsBase = Array.isArray(user.disciplinas) ? user.disciplinas : [];
  const idsOverride = Array.isArray(usuariosDisciplinasOverride[String(user.id)])
    ? usuariosDisciplinasOverride[String(user.id)].map(Number)
    : [];

  const ids = [...new Set([...idsBase, ...idsOverride])];
  const disciplinasMescladas = getDisciplinasMescladas();

  return disciplinasMescladas
    .filter((d) => ids.includes(Number(d.id)))
    .filter((d) => Number(d.instituicaoId) === Number(user.faculdadeId))
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
}, [user, turmasOverrideVer]);

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

  const isEditarTurmaAtivo =
    location.pathname === "/editar-turma" ||
    location.pathname === "/editar-turma-coordenador" ||
    location.pathname.startsWith("/editar-turma/");

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
          <>
            <div className="menuLateral__user-details">
              <strong className="menuLateral__user-title">{user.nome}</strong>

              {/* use só o que fizer sentido no seu JSON */}
              {user?.user && (
                <span className="menuLateral__user-sub">{user.user}</span>
              )}
              {user?.login && (
                <span className="menuLateral__user-sub">{user.login}</span>
              )}
            </div>

            {/* ✅ botão não interfere no layout do conteúdo */}
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
          {/* ✅ TURMA ATUAL (coordenador / professor / responsável) */}
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
                className={`menuLateral__btn ${isEditarTurmaAtivo ? "active" : ""}`}
                onClick={() =>
                  navigate(
                    isCoordenador
                      ? "/editar-turma-coordenador"
                      : "/editar-turma",
                  )
                }
              >
                <Settings size={20} />
                <span>Editar Turma</span>
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
                className={`menuLateral__btn ${isEditarTurmaAtivo ? "active" : ""}`}
                onClick={() =>
                  navigate(
                    isCoordenador
                      ? "/editar-turma-coordenador"
                      : "/editar-turma",
                  )
                }
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
