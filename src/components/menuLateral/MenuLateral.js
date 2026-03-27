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
  ArrowLeft,
} from "lucide-react";

import {
  getUsuarioLogado,
  getInstituicaoById,
  getDisciplinasPermitidas,
  getUsuariosMesclados,
  setDisciplinaAtual,
} from "../../utils/storageData";
import dados from "../../data/dados.json";

const MenuLateral = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [perfilAberto, setPerfilAberto] = useState(false);
  const [disciplinaAbertaId, setDisciplinaAbertaId] = useState(null);
  const [paletaAbertaId, setPaletaAbertaId] = useState(null);
  const [corTemporaria, setCorTemporaria] = useState("#76A8D9");
  const [dataVersion, setDataVersion] = useState(0);
  const [disciplinaAtualId, setDisciplinaAtualId] = useState(
    () => localStorage.getItem("disciplinaAtualId") || "",
  );

  const [mostrarSecundarias, setMostrarSecundarias] = useState(() => {
    const salvo = localStorage.getItem("menuAlunoSecundariasVisiveis");
    return salvo === null ? false : salvo === "true";
  });

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
      window.removeEventListener(
        "disciplinaAtual:changed",
        syncDisciplinaAtual,
      );
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const user = useMemo(() => getUsuarioLogado(), [dataVersion]);

  const instituicao = useMemo(() => {
    if (!user) return null;
    return getInstituicaoById(user.faculdadeId);
  }, [user, dataVersion]);

  useEffect(() => {
    localStorage.setItem(
      "menuAlunoSecundariasVisiveis",
      String(mostrarSecundarias),
    );
  }, [mostrarSecundarias]);

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  }

  const usuariosMesclados = useMemo(
    () => getUsuariosMesclados(),
    [dataVersion],
  );

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

  const tipoUsuario = String(user?.tipo || "").toLowerCase();

  const rotaComMenuAluno =
    location.pathname === "/dashboard" ||
    location.pathname.startsWith("/detalhe-calendario-aluno");

  const usarFluxoAluno =
    tipoUsuario === "aluno" ||
    (tipoUsuario === "responsavel" && rotaComMenuAluno);

  const disciplinasDoUsuario = useMemo(() => {
    if (!user) return [];

    if (!usarFluxoAluno) {
      const disciplinas = getDisciplinasPermitidas(user) || [];

      return [...disciplinas];
    }

    const baseDisciplinas = Array.isArray(dados?.disciplinas)
      ? dados.disciplinas
      : [];

    const turmasOverride = safeJsonParse(
      localStorage.getItem("turmas_override"),
      [],
    );

    const mapa = new Map();

    baseDisciplinas.forEach((disc) => {
      mapa.set(Number(disc.id), disc);
    });

    if (Array.isArray(turmasOverride)) {
      turmasOverride.forEach((disc) => {
        mapa.set(Number(disc.id), disc);
      });
    }

    const disciplinasMescladas = Array.from(mapa.values());

    const disciplinasFiltradas = disciplinasMescladas.filter((disc) => {
      const alunoIds = Array.isArray(disc.alunoIds)
        ? disc.alunoIds.map(Number).filter(Boolean)
        : disc.alunoId !== undefined &&
            disc.alunoId !== null &&
            disc.alunoId !== ""
          ? [Number(disc.alunoId)].filter(Boolean)
          : [];

      return alunoIds.includes(Number(user.id));
    });

    return disciplinasFiltradas.sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"),
    );
  }, [user, usarFluxoAluno, dataVersion]);

  useEffect(() => {
    if (!disciplinasDoUsuario.length) {
      setDisciplinaAtualId("");
      localStorage.removeItem("disciplinaAtualId");
      window.dispatchEvent(new Event("disciplinaAtual:changed"));
      return;
    }

    const existeNaLista = disciplinasDoUsuario.some(
      (d) => String(d.id) === String(disciplinaAtualId),
    );

    if (!disciplinaAtualId || !existeNaLista) {
      const firstId = String(disciplinasDoUsuario[0].id);
      setDisciplinaAtualId(firstId);
      localStorage.setItem("disciplinaAtualId", firstId);
      window.dispatchEvent(new Event("disciplinaAtual:changed"));
    }
  }, [disciplinaAtualId, disciplinasDoUsuario]);

  if (!user) return null;

  const primeiraLetra = String(user.nome || "")
    .trim()
    .charAt(0)
    .toUpperCase();

  const isAluno = usarFluxoAluno;
  const isCoordenador = tipoUsuario === "coordenador";
  const isResponsavel = tipoUsuario === "responsavel";
  const mostrarBotaoVoltarInicio = isResponsavel && !isAluno;

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

  const getTituloCurto = (nome) => {
    const texto = String(nome || "").trim();

    return texto
      .replace(/\s*-\s*Turma\s+\d+$/i, "")
      .replace(/^Monitoria do Curso de\s+/i, "Monitoria ")
      .replace(/^Introdução aos?\s+/i, "")
      .trim();
  };

  const getCorDisciplinaUsuario = (disc) => {
    const usuarioId = String(user?.id || "");
    return disc?.coresPorUsuario?.[usuarioId] || disc?.cor || "#76A8D9";
  };

  const salvarCorDisciplinaUsuario = (disciplinaId, novaCor) => {
    const usuarioId = String(user?.id || "");

    const baseDisciplinas = Array.isArray(dados?.disciplinas)
      ? dados.disciplinas
      : [];

    const turmasOverride = safeJsonParse(
      localStorage.getItem("turmas_override"),
      [],
    );

    const mapa = new Map();

    baseDisciplinas.forEach((disc) => {
      mapa.set(Number(disc.id), { ...disc });
    });

    if (Array.isArray(turmasOverride)) {
      turmasOverride.forEach((disc) => {
        mapa.set(Number(disc.id), { ...disc });
      });
    }

    const disciplinasAtualizadas = Array.from(mapa.values()).map((disc) => {
      if (Number(disc.id) !== Number(disciplinaId)) return disc;

      return {
        ...disc,
        coresPorUsuario: {
          ...(disc.coresPorUsuario || {}),
          [usuarioId]: novaCor,
        },
      };
    });

    localStorage.setItem(
      "turmas_override",
      JSON.stringify(disciplinasAtualizadas),
    );
    setDataVersion((v) => v + 1);
    window.dispatchEvent(new Event("app:data-changed"));
  };

  const resetarCorDisciplinaUsuario = (disciplinaId) => {
    const usuarioId = String(user?.id || "");

    const baseDisciplinas = Array.isArray(dados?.disciplinas)
      ? dados.disciplinas
      : [];

    const turmasOverride = safeJsonParse(
      localStorage.getItem("turmas_override"),
      [],
    );

    const mapa = new Map();

    baseDisciplinas.forEach((disc) => {
      mapa.set(Number(disc.id), { ...disc });
    });

    if (Array.isArray(turmasOverride)) {
      turmasOverride.forEach((disc) => {
        mapa.set(Number(disc.id), { ...disc });
      });
    }

    const disciplinasAtualizadas = Array.from(mapa.values()).map((disc) => {
      if (Number(disc.id) !== Number(disciplinaId)) return disc;

      const proximasCores = { ...(disc.coresPorUsuario || {}) };
      delete proximasCores[usuarioId];

      return {
        ...disc,
        coresPorUsuario: proximasCores,
      };
    });

    localStorage.setItem(
      "turmas_override",
      JSON.stringify(disciplinasAtualizadas),
    );
    setDataVersion((v) => v + 1);
    window.dispatchEvent(new Event("app:data-changed"));
  };

  const disciplinasPrimarias = isAluno
    ? disciplinasDoUsuario.filter(
        (disc) => String(disc.tipo || "").toLowerCase() !== "secundaria",
      )
    : [];

  const disciplinasSecundarias = isAluno
    ? disciplinasDoUsuario.filter(
        (disc) => String(disc.tipo || "").toLowerCase() === "secundaria",
      )
    : [];

  const getProfessorPrincipal = (disc) => {
    const professorIds = normalizarIds(disc.professorIds, disc.professorId);

    return (
      professorIds
        .map((id) => getUsuarioById(id))
        .find((p) => p && String(p.tipo || "").toLowerCase() === "professor") ||
      professorIds.map((id) => getUsuarioById(id)).find(Boolean) ||
      null
    );
  };

  const renderDisciplinaAluno = (disc) => {
    const open = disciplinaAbertaId === disc.id;
    const paletaAberta = paletaAbertaId === disc.id;
    const professorPrincipal = getProfessorPrincipal(disc);
    const corAtual = getCorDisciplinaUsuario(disc);

    return (
      <div
        key={disc.id}
        className={`menuLateral__materiaWrap ${open ? "open" : ""}`}
        style={{ "--discColor": corAtual }}
      >
        <div className={`menuLateral__materiaItem ${open ? "open" : ""}`}>
          <button
            type="button"
            className="menuLateral__dotBtn"
            onClick={(e) => {
              e.stopPropagation();
              setPaletaAbertaId((prev) => {
                const vaiAbrir = prev !== disc.id;
                if (vaiAbrir) {
                  setCorTemporaria(corAtual);
                }
                return vaiAbrir ? disc.id : null;
              });
            }}
            aria-label="Alterar cor da turma"
            title="Alterar cor da turma"
          >
            <span className="menuLateral__dot" />
          </button>

          <button
            type="button"
            className="menuLateral__materiaMain"
            onClick={() => setDisciplinaAbertaId(open ? null : disc.id)}
          >
            <span className="menuLateral__materiaTitle">
              {getTituloCurto(disc.nome)}
            </span>
            <span className="menuLateral__materiaToggle">
              {open ? "–" : "+"}
            </span>
          </button>
        </div>

        {paletaAberta && (
          <div
            className="menuLateral__colorPopover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="menuLateral__colorHeader">Selecionar cor</div>

            <div className="menuLateral__colorBody">
              <input
                type="color"
                className="menuLateral__colorInput"
                value={corTemporaria}
                onChange={(e) => setCorTemporaria(e.target.value)}
              />

              <div className="menuLateral__colorPreviewWrap">
                <span
                  className="menuLateral__colorPreview"
                  style={{ backgroundColor: corTemporaria }}
                />
                <span className="menuLateral__colorHex">
                  {String(corTemporaria || "").toUpperCase()}
                </span>
              </div>
            </div>

            <div className="menuLateral__colorActions">
              <button
                type="button"
                className="menuLateral__colorBtn menuLateral__colorBtn--ghost"
                onClick={() => {
                  resetarCorDisciplinaUsuario(disc.id);
                  setPaletaAbertaId(null);
                }}
              >
                Resetar
              </button>

              <button
                type="button"
                className="menuLateral__colorBtn menuLateral__colorBtn--primary"
                onClick={() => {
                  salvarCorDisciplinaUsuario(disc.id, corTemporaria);
                  setPaletaAbertaId(null);
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        )}

        {open && (
          <div className="menuLateral__materiaDetails">
            <div className="menuLateral__detailsTitle">
              {String(disc.nome || "")}
            </div>

            <div className="menuLateral__detailsLine">
              <strong>Professor:</strong>{" "}
              <span className="menuLateral__detailsValue">
                {professorPrincipal?.nome || "—"}
                <br />
                {professorPrincipal?.contato || "—"}
              </span>
            </div>

            <div className="menuLateral__detailsLine">
              <strong>Aluno:</strong>{" "}
              <span className="menuLateral__detailsValue">
                {user.nome || "—"}
                <br />
                {user.contato || "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

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

                  if (
                    location.pathname.startsWith("/editar-turma-coordenador")
                  ) {
                    navigate(`/editar-turma-coordenador/${next}`);
                    return;
                  }

                  if (location.pathname.startsWith("/editar-turma")) {
                    navigate(`/editar-turma/${next}`);
                  }
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
              {disciplinasPrimarias.map(renderDisciplinaAluno)}

              {!!disciplinasSecundarias.length && (
                <div className="menuLateral__extensoes">
                  <button
                    type="button"
                    className={`menuLateral__extensoesToggle ${
                      mostrarSecundarias ? "is-open" : "is-closed"
                    }`}
                    onClick={() => setMostrarSecundarias((prev) => !prev)}
                    aria-label={
                      mostrarSecundarias
                        ? "Ocultar turmas secundárias"
                        : "Mostrar turmas secundárias"
                    }
                  >
                    <span className="menuLateral__extensoesText">
                      Extensões acadêmica
                    </span>
                    <span
                      className={`menuLateral__extensoesEye ${
                        mostrarSecundarias ? "is-open" : "is-closed"
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {mostrarSecundarias && (
                    <div className="menuLateral__extensoesList">
                      {disciplinasSecundarias.map(renderDisciplinaAluno)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : isCoordenador ? (
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
                className={`menuLateral__btn ${isActive("/nova-turma") ? "active" : ""}`}
                onClick={() => navigate("/nova-turma")}
              >
                <Plus size={20} />
                <span>Criar Turmas</span>
              </button>

              <button
                className={`menuLateral__btn ${isEditarTurmaAtivo ? "active" : ""}`}
                onClick={() => navigate("/editar-turma-coordenador")}
              >
                <Settings size={20} />
                <span>Editar Turmas</span>
              </button>

              <button
                className={`menuLateral__btn ${isActive("/ver-calendario") ? "active" : ""}`}
                onClick={() => navigate("/ver-calendario")}
              >
                <Calendar size={20} />
                <span>Calendário</span>
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
                onClick={() => {
                  if (!disciplinaAtualId) return;
                  navigate(`/editar-turma/${disciplinaAtualId}`);
                }}
              >
                <Settings size={20} />
                <span>Editar Turma</span>
              </button>

              {mostrarBotaoVoltarInicio && (
                <button
                  className="menuLateral__btn menuLateral__btn--back"
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowLeft size={20} />
                  <span>Voltar para a página inicial</span>
                </button>
              )}
            </>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default MenuLateral;
