import data from "../data/dados.json";

export const STORAGE_USUARIOS = "usuarios_override";
export const STORAGE_TURMAS = "turmas_override";
export const STORAGE_USUARIOS_DISCIPLINAS = "usuarios_disciplinas_override";
export const STORAGE_DISCIPLINAS_KEYS = [
  "turmas_override",
  "disciplinas_override",
  "disciplinas",
  "turmas",
];

export function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

export function readStorageObject(key) {
  return safeJsonParse(localStorage.getItem(key), {});
}

export function writeStorageObject(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function mergeById(baseList, overrideMap) {
  const map = {};

  (Array.isArray(baseList) ? baseList : []).forEach((item) => {
    map[String(item.id)] = { ...item };
  });

  Object.entries(overrideMap || {}).forEach(([id, patch]) => {
    map[String(id)] = {
      ...(map[String(id)] || {}),
      ...patch,
    };
  });

  return Object.values(map);
}

export function getInstituicoesMescladas() {
  return Array.isArray(data.instituicoes) ? data.instituicoes : [];
}

export function getUsuariosMesclados() {
  const overrides = readStorageObject(STORAGE_USUARIOS);
  return mergeById(data.usuarios || [], overrides);
}

export function getDisciplinasMescladas() {
  const overrides = readStorageObject(STORAGE_TURMAS);
  return mergeById(data.disciplinas || [], overrides);
}

export function getEventosMesclados() {
  const overrides = readStorageObject("eventos_override");
  return mergeById(data.eventos || [], overrides);
}

export function getUsuariosDisciplinasOverride() {
  return readStorageObject(STORAGE_USUARIOS_DISCIPLINAS);
}

export function getUsuarioById(id) {
  return (
    getUsuariosMesclados().find((u) => Number(u.id) === Number(id)) || null
  );
}

export function getInstituicaoById(id) {
  return (
    getInstituicoesMescladas().find((i) => Number(i.id) === Number(id)) || null
  );
}

export function getUsuarioLogado() {
  const usuarioStorage = safeJsonParse(localStorage.getItem("usuario"), null);

  if (!usuarioStorage?.id) return null;

  return (
    getUsuariosMesclados().find(
      (u) => Number(u.id) === Number(usuarioStorage.id)
    ) || null
  );
}

function normalizarIds(ids, idAntigo) {
  if (Array.isArray(ids)) {
    return ids.map(Number).filter(Boolean);
  }

  if (idAntigo !== undefined && idAntigo !== null && idAntigo !== "") {
    return [Number(idAntigo)].filter(Boolean);
  }

  return [];
}

export function getDisciplinasPermitidas(user) {
  if (!user) return [];

  const disciplinasMescladas = getDisciplinasMescladas();
  const usuariosDisciplinasOverride = getUsuariosDisciplinasOverride();

  const userId = Number(user.id);
  const faculdadeId = Number(user.faculdadeId);

  const idsBaseUsuario = Array.isArray(user.disciplinas)
    ? user.disciplinas.map(Number)
    : [];

  const idsOverrideUsuario = Array.isArray(
    usuariosDisciplinasOverride[String(user.id)]
  )
    ? usuariosDisciplinasOverride[String(user.id)].map(Number)
    : [];

  const idsUsuario = [...new Set([...idsBaseUsuario, ...idsOverrideUsuario])];

  const disciplinasDaFaculdade = disciplinasMescladas.filter(
    (d) => Number(d.instituicaoId) === faculdadeId
  );

  return disciplinasDaFaculdade.filter((d) => {
    const professorIds = normalizarIds(d.professorIds, d.professorId);
    const responsavelIds = normalizarIds(d.responsavelIds, d.responsavelId);
    const coordenadorIds = normalizarIds(d.coordenadorIds, d.coordenadorId);
    const alunoIds = normalizarIds(d.alunoIds, d.alunoId);

    const pertenceNovoModelo =
      professorIds.includes(userId) ||
      responsavelIds.includes(userId) ||
      coordenadorIds.includes(userId) ||
      alunoIds.includes(userId);

    const pertenceModeloAntigo = idsUsuario.includes(Number(d.id));

    if (user.tipo === "coordenador") {
  return (
    coordenadorIds.includes(userId) ||
    Number(d.criado_por) === userId ||
    pertenceModeloAntigo ||
    Number(d.instituicaoId) === faculdadeId
  );
}

    if (user.tipo === "professor") {
      return professorIds.includes(userId) || pertenceModeloAntigo;
    }

    if (user.tipo === "responsavel") {
      return responsavelIds.includes(userId) || alunoIds.includes(userId) || pertenceModeloAntigo;
    }

    if (user.tipo === "aluno") {
      return alunoIds.includes(userId) || pertenceModeloAntigo;
    }

    return pertenceNovoModelo || pertenceModeloAntigo;
  });
}

export function saveOverrideById(storageKey, id, patch) {
  const overrides = readStorageObject(storageKey);

  overrides[String(id)] = {
    ...(overrides[String(id)] || {}),
    ...patch,
  };

  writeStorageObject(storageKey, overrides);
  notifyDataChanged();
}

export function notifyDataChanged() {
  window.dispatchEvent(new Event("app:data-changed"));
}

export function setDisciplinaAtual(id) {
  if (id === null || id === undefined || id === "") {
    localStorage.removeItem("disciplinaAtualId");
  } else {
    localStorage.setItem("disciplinaAtualId", String(id));
  }

  window.dispatchEvent(new Event("disciplinaAtual:changed"));
  notifyDataChanged();
}