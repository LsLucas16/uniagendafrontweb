import React, { useEffect, useMemo, useState } from "react";
import dados from "../../data/dados.json";
import "./CalendarioLateralAluno.scss";

const STORAGE_EVENTOS_KEYS = [
  "eventos_override",
  "eventos",
  "eventosStore",
  "uniagenda_eventos",
];

const STORAGE_DISCIPLINAS_KEYS = [
  "turmas_override",
  "disciplinas_override",
  "disciplinas",
  "turmas",
];

const STORAGE_USUARIO_KEYS = [
  "usuario",
  "usuarioLogado",
  "user",
  "authUser",
  "loggedUser",
];

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function readAllStorageArrays(keys) {
  const result = [];

  keys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const parsed = safeParse(raw, null);
    if (Array.isArray(parsed)) {
      result.push(...parsed);
    }
  });

  return result;
}

function readLoggedUser() {
  for (const key of STORAGE_USUARIO_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    const parsed = safeParse(raw, null);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  }

  return null;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function parseDateOnly(value) {
  if (!value) return null;

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [year, month, day] = raw.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatGroupLabel(date, today) {
  if (!date) return "";
  if (date.getTime() === today.getTime()) return "Hoje";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function normalizarDisciplinaIds(evento) {
  if (Array.isArray(evento?.disciplinaIds)) {
    return evento.disciplinaIds.map(Number).filter(Boolean);
  }

  if (evento?.disciplinaId != null) {
    return [Number(evento.disciplinaId)].filter(Boolean);
  }

  return [];
}

function getMergedDisciplinas() {
  const jsonList = Array.isArray(dados?.disciplinas) ? dados.disciplinas : [];
  const storageList = readAllStorageArrays(STORAGE_DISCIPLINAS_KEYS);

  const map = new Map();

  jsonList.forEach((item) => {
    if (!item || item.id == null) return;
    map.set(Number(item.id), item);
  });

  storageList.forEach((item) => {
    if (!item || item.id == null) return;

    const id = Number(item.id);
    const anterior = map.get(id) || {};

    map.set(id, {
      ...anterior,
      ...item,
    });
  });

  return Array.from(map.values());
}

function getMergedEventos() {
  const jsonList = Array.isArray(dados?.eventos) ? dados.eventos : [];
  const storageList = readAllStorageArrays(STORAGE_EVENTOS_KEYS);

  const map = new Map();

  jsonList.forEach((item) => {
    if (!item || item.id == null) return;
    map.set(Number(item.id), item);
  });

  storageList.forEach((item) => {
    if (!item || item.id == null) return;

    const id = Number(item.id);
    const anterior = map.get(id) || {};

    map.set(id, {
      ...anterior,
      ...item,
    });
  });

  return Array.from(map.values());
}

function resolveAlunoId(usuario) {
  if (!usuario) return null;
  if (usuario.id != null) return Number(usuario.id);

  const usuarios = Array.isArray(dados?.usuarios) ? dados.usuarios : [];

  const byUser = usuarios.find(
    (u) => normalizeText(u.user) === normalizeText(usuario.user),
  );
  if (byUser?.id != null) return Number(byUser.id);

  const byNome = usuarios.find(
    (u) => normalizeText(u.nome) === normalizeText(usuario.nome),
  );
  if (byNome?.id != null) return Number(byNome.id);

  return null;
}

function getAlunoDisciplinas(alunoId, disciplinas) {
  if (alunoId == null) return [];

  return disciplinas.filter((disciplina) => {
    const alunoIds = Array.isArray(disciplina?.alunoIds)
      ? disciplina.alunoIds.map(Number)
      : [];

    return alunoIds.includes(Number(alunoId));
  });
}

function getEventoDisciplinaPrincipal(
  evento,
  disciplinasMap,
  disciplinaIdsDoAluno,
) {
  const ids = normalizarDisciplinaIds(evento);

  for (const id of ids) {
    if (!disciplinaIdsDoAluno.has(id)) continue;
    const disciplina = disciplinasMap.get(id);
    if (disciplina) return disciplina;
  }

  for (const id of ids) {
    const disciplina = disciplinasMap.get(id);
    if (disciplina) return disciplina;
  }

  return null;
}

function groupEventosByDate(eventos, today) {
  const grouped = {};

  eventos.forEach((evento) => {
    const date = parseDateOnly(evento?.dataEvento);
    if (!date || date < today) return;

    const key = toDateKey(date);

    if (!grouped[key]) {
      grouped[key] = {
        key,
        date,
        eventos: [],
      };
    }

    grouped[key].eventos.push(evento);
  });

  return Object.values(grouped).sort((a, b) => a.date - b.date);
}

function clampDescription(text, max = 58) {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}...`;
}

function getCorDisciplinaParaUsuario(disciplina, usuarioId) {
  const userId = String(usuarioId || "");

  return disciplina?.coresPorUsuario?.[userId] || disciplina?.cor || "#E4B84C";
}

export default function CalendarioAlunoLateral() {
  const [dataVersion, setDataVersion] = useState(0);
  const [openKeys, setOpenKeys] = useState([]);

  const today = useMemo(() => startOfToday(), []);

  useEffect(() => {
    const bump = () => setDataVersion((v) => v + 1);

    const onStorage = (e) => {
      if (!e.key) {
        bump();
        return;
      }

      if (
        STORAGE_DISCIPLINAS_KEYS.includes(e.key) ||
        STORAGE_EVENTOS_KEYS.includes(e.key) ||
        STORAGE_USUARIO_KEYS.includes(e.key)
      ) {
        bump();
      }
    };

    window.addEventListener("app:data-changed", bump);
    window.addEventListener("eventos:changed", bump);
    window.addEventListener("disciplinaAtual:changed", bump);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("app:data-changed", bump);
      window.removeEventListener("eventos:changed", bump);
      window.removeEventListener("disciplinaAtual:changed", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const usuarioLogado = useMemo(() => readLoggedUser(), [dataVersion]);
  const tipoUsuario = String(usuarioLogado?.tipo || "").toLowerCase();
  const isAluno = tipoUsuario === "aluno" || tipoUsuario === "responsavel";

  const disciplinas = useMemo(() => getMergedDisciplinas(), [dataVersion]);
  const eventos = useMemo(() => getMergedEventos(), [dataVersion]);

  const alunoId = useMemo(() => {
    if (!isAluno) return null;
    return resolveAlunoId(usuarioLogado);
  }, [isAluno, usuarioLogado]);

  const disciplinasDoAluno = useMemo(() => {
    if (!isAluno) return [];
    return getAlunoDisciplinas(alunoId, disciplinas);
  }, [isAluno, alunoId, disciplinas]);

  const disciplinaIdsDoAluno = useMemo(() => {
    return new Set(disciplinasDoAluno.map((item) => Number(item.id)));
  }, [disciplinasDoAluno]);

  const disciplinasMap = useMemo(() => {
    const map = new Map();

    disciplinas.forEach((disciplina) => {
      if (disciplina?.id == null) return;
      map.set(Number(disciplina.id), disciplina);
    });

    return map;
  }, [disciplinas]);

  const eventosDoAluno = useMemo(() => {
    if (!isAluno) return [];

    return eventos
      .filter((evento) => {
        if (!evento?.calendario) return false;

        const data = parseDateOnly(evento?.dataEvento);
        if (!data || data < today) return false;

        const ids = normalizarDisciplinaIds(evento);
        if (!ids.length) return false;

        return ids.some((id) => disciplinaIdsDoAluno.has(id));
      })
      .sort((a, b) => {
        const da = parseDateOnly(a?.dataEvento)?.getTime() || 0;
        const db = parseDateOnly(b?.dataEvento)?.getTime() || 0;

        if (da !== db) return da - db;

        const ua = new Date(a?.ultimaAtualizacao || 0).getTime() || 0;
        const ub = new Date(b?.ultimaAtualizacao || 0).getTime() || 0;
        return ub - ua;
      });
  }, [isAluno, eventos, today, disciplinaIdsDoAluno]);

  const grupos = useMemo(() => {
    const grouped = groupEventosByDate(eventosDoAluno, today);

    return grouped.map((group) => ({
      ...group,
      label: formatGroupLabel(group.date, today),
      eventos: group.eventos.map((evento) => {
        const disciplina = getEventoDisciplinaPrincipal(
          evento,
          disciplinasMap,
          disciplinaIdsDoAluno,
        );

        return {
          ...evento,
          disciplinaNome: disciplina?.nome || "Sem disciplina",
          disciplinaCor: getCorDisciplinaParaUsuario(disciplina, alunoId),
        };
      }),
    }));
  }, [eventosDoAluno, today, disciplinasMap, disciplinaIdsDoAluno, alunoId]);

  useEffect(() => {
    const keysValidas = new Set(grupos.map((grupo) => grupo.key));

    setOpenKeys((prev) => prev.filter((key) => keysValidas.has(key)));
  }, [grupos]);

  function toggleGroup(key) {
    setOpenKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }

      return [...prev, key];
    });
  }

  function abrirTodos() {
    setOpenKeys(grupos.map((grupo) => grupo.key));
  }

  function fecharTodos() {
    setOpenKeys([]);
  }

  if (!isAluno) return null;

  return (
    <aside className="calendario-aluno-lateral">
      {grupos.length === 0 ? (
        <div className="calendario-aluno-lateral__empty">
          Nenhum evento de hoje ou futuro.
        </div>
      ) : (
        grupos.map((grupo) => {
          const isOpen = openKeys.includes(grupo.key);

          return (
            <section
              key={grupo.key}
              className="calendario-aluno-lateral__group"
            >
              <button
                type="button"
                className="calendario-aluno-lateral__groupHeader"
                onClick={() => toggleGroup(grupo.key)}
              >
                <span className="calendario-aluno-lateral__groupLabel">
                  {grupo.label}
                </span>

                <span
                  className={`calendario-aluno-lateral__chevron ${
                    isOpen ? "is-open" : ""
                  }`}
                >
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {isOpen && (
                <div className="calendario-aluno-lateral__list">
                  {grupo.eventos.map((evento) => (
                    <article
                      key={`${grupo.key}-${evento.id}`}
                      className="calendario-aluno-lateral__card"
                      style={{
                        "--bar-color": evento.disciplinaCor,
                        "--dot-color": evento.disciplinaCor,
                      }}
                    >
                      <h4 className="calendario-aluno-lateral__title">
                        {evento.titulo}
                      </h4>

                      <p className="calendario-aluno-lateral__description">
                        {clampDescription(evento.descricao, 62)}
                      </p>

                      <div className="calendario-aluno-lateral__tag">
                        <span className="calendario-aluno-lateral__dot" />
                        <span>{evento.disciplinaNome}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </aside>
  );
}