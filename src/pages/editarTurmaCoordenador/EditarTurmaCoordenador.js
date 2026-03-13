import React, { useEffect, useMemo, useState } from "react";
import { Search, Pencil, Trash2, Users } from "lucide-react";
import dados from "../../data/dados.json";
import "./EditarTurmaCoordenador.scss";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const STORAGE_TURMAS = "turmas_override";
const STORAGE_TURMA_ALUNOS = "turma_alunos_override";
const STORAGE_TURMAS_DELETED = "turmas_deleted";
const STORAGE_USUARIOS_DISCIPLINAS = "usuarios_disciplinas_override";

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

function getTurmaAlunosOverride() {
  return safeJsonParse(localStorage.getItem(STORAGE_TURMA_ALUNOS), {});
}

function getTurmasDeleted() {
  return safeJsonParse(localStorage.getItem(STORAGE_TURMAS_DELETED), []);
}

function getUsuariosDisciplinasOverride() {
  return safeJsonParse(localStorage.getItem(STORAGE_USUARIOS_DISCIPLINAS), {});
}

function getDisciplinasMescladas() {
  const overrides = getTurmasOverride();
  const base = Array.isArray(dados.disciplinas) ? dados.disciplinas : [];

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

function saveTurmasDeleted(next) {
  localStorage.setItem(STORAGE_TURMAS_DELETED, JSON.stringify(next));
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
  const navigate = useNavigate();

  const usuario = useMemo(() => getUsuarioLogado(), []);
  const overrides = useMemo(() => getTurmasOverride(), [overrideVersion]);
  const alunosOverride = useMemo(
    () => getTurmaAlunosOverride(),
    [overrideVersion],
  );
  const turmasDeleted = useMemo(() => getTurmasDeleted(), [overrideVersion]);

  useEffect(() => {
    const refresh = () => setOverrideVersion((v) => v + 1);

    const onStorage = (e) => {
      if (
        e.key === STORAGE_TURMAS ||
        e.key === STORAGE_TURMA_ALUNOS ||
        e.key === STORAGE_TURMAS_DELETED ||
        e.key === "disciplinaAtualId"
      ) {
        refresh();
      }
    };

    window.addEventListener("turmas:changed", refresh);
    window.addEventListener("disciplinaAtual:changed", refresh);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("turmas:changed", refresh);
      window.removeEventListener("disciplinaAtual:changed", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const usuarioCompleto = useMemo(() => {
    if (!usuario?.id) return null;
    return dados.usuarios.find((u) => u.id === usuario.id) || null;
  }, [usuario]);

 const turmasDaCoordenacao = useMemo(() => {
  if (!usuarioCompleto) return [];

  const usuariosDisciplinasOverride = getUsuariosDisciplinasOverride();
  const idsBase = Array.isArray(usuarioCompleto.disciplinas)
    ? usuarioCompleto.disciplinas
    : [];

  const idsOverride = Array.isArray(
    usuariosDisciplinasOverride[String(usuarioCompleto.id)],
  )
    ? usuariosDisciplinasOverride[String(usuarioCompleto.id)].map(Number)
    : [];

  const idsDoUsuario = [...new Set([...idsBase, ...idsOverride])];
  const disciplinasMescladas = getDisciplinasMescladas();

  return disciplinasMescladas
    .filter(
      (disc) => Number(disc.instituicaoId) === Number(usuarioCompleto.faculdadeId),
    )
    .filter((disc) => idsDoUsuario.includes(Number(disc.id)))
    .filter((disc) => !turmasDeleted.includes(Number(disc.id)))
    .map((disc) => {
      const professor =
        dados.usuarios.find((u) => Number(u.id) === Number(disc.professorId)) || null;

         const responsaveis = Array.isArray(disc.responsaveis)
    ? disc.responsaveis
    : [];

      const alunosBase = (dados.usuarios || []).filter(
        (u) =>
          u.tipo === "aluno" &&
          Number(u.faculdadeId) === Number(disc.instituicaoId) &&
          Array.isArray(u.disciplinas) &&
          u.disciplinas.includes(Number(disc.id)),
      );

      const alunosIdsOverride = Array.isArray(alunosOverride[String(disc.id)])
        ? alunosOverride[String(disc.id)].map(Number)
        : null;

      const alunosCount =
        alunosIdsOverride !== null ? alunosIdsOverride.length : alunosBase.length;

     return {
  ...disc,
  professor,
  responsaveis,
  alunosCount,
};
    })
    .sort((a, b) => String(a.nome).localeCompare(String(a.nome), "pt-BR"));
}, [usuarioCompleto, overrides, alunosOverride, turmasDeleted]);

  const turmasFiltradas = useMemo(() => {
    const termo = normStr(busca);

    if (!termo) return turmasDaCoordenacao;

    return turmasDaCoordenacao.filter((turma) => {
      const nome = normStr(turma.nome);
      const professor = normStr(turma.professor?.nome);
      return nome.includes(termo) || professor.includes(termo);
    });
  }, [busca, turmasDaCoordenacao]);

  async function handleDeleteTurma(turma) {
    const result = await Swal.fire({
      title: "Excluir turma?",
      text: `Tem certeza que deseja excluir "${turma.nome}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      confirmButtonColor: "#d64545",
      cancelButtonColor: "#94a3b8",
    });

    if (!result.isConfirmed) return;

    const currentDeleted = getTurmasDeleted();
    const nextDeleted = Array.from(
      new Set([...currentDeleted, Number(turma.id)]),
    );

    saveTurmasDeleted(nextDeleted);

    const currentOverrides = getTurmasOverride();
    if (currentOverrides[String(turma.id)]) {
      const nextOverrides = { ...currentOverrides };
      delete nextOverrides[String(turma.id)];
      saveTurmasOverride(nextOverrides);
    }

    const currentAlunosOverride = getTurmaAlunosOverride();
    if (currentAlunosOverride[String(turma.id)]) {
      const nextAlunosOverride = { ...currentAlunosOverride };
      delete nextAlunosOverride[String(turma.id)];
      localStorage.setItem(
        STORAGE_TURMA_ALUNOS,
        JSON.stringify(nextAlunosOverride),
      );
    }

    const disciplinaAtualId = localStorage.getItem("disciplinaAtualId");
    if (String(disciplinaAtualId) === String(turma.id)) {
      localStorage.removeItem("disciplinaAtualId");
      window.dispatchEvent(new Event("disciplinaAtual:changed"));
    }

    window.dispatchEvent(new Event("turmas:changed"));
    setOverrideVersion((v) => v + 1);

    await Swal.fire({
      title: "Turma excluída",
      text: "A alteração foi salva no navegador.",
      icon: "success",
      confirmButtonColor: "#3b82f6",
    });
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
            turmasFiltradas.map((turma) => (
              <article
                key={turma.id}
                className="editar-turmas-coord__item"
                style={{ "--barColor": turma.cor || "#60a5fa" }}
              >
                <div className="editar-turmas-coord__bar" />

                <div className="editar-turmas-coord__content">
                  <div className="editar-turmas-coord__main">
                    <h2 className="editar-turmas-coord__title">{turma.nome}</h2>

                    <div className="editar-turmas-coord__meta">
  {turma.professor?.nome && (
    <span> {turma.professor.nome}</span>
  )}

  {Array.isArray(turma.responsaveis) &&
    turma.responsaveis.map((r, index) => (
      <span key={`${r.userId || r.nome}-${index}`}>
         {r.nome} {r.cargo ? `- ${r.cargo}` : ""}
      </span>
    ))}
</div>
                  </div>

                  <div className="editar-turmas-coord__right">
                    <div className="editar-turmas-coord__students">
                      <Users size={17} />
                      <span>{turma.alunosCount} alunos</span>
                    </div>

                    <div className="editar-turmas-coord__actions">
                      <button
                        type="button"
                        onClick={() => navigate(`/editar-turma/${turma.id}`)}
                        aria-label="Editar turma"
                        title="Editar turma"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTurma(turma)}
                        aria-label="Excluir turma"
                        title="Excluir turma"
                        className="is-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}