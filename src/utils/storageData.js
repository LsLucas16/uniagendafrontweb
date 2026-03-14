import data from "../data/dados.json";

export const STORAGE_USUARIOS = "usuarios_override";
export const STORAGE_TURMAS = "turmas_override";
export const STORAGE_USUARIOS_DISCIPLINAS = "usuarios_disciplinas_override";
export const STORAGE_EVENTOS = "eventos_override";

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
  const overrides = readStorageObject(STORAGE_EVENTOS);
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

export function getDisciplinasPermitidas(user) {
  if (!user) return [];

  const disciplinasMescladas = getDisciplinasMescladas();

  const disciplinasDaFaculdade = disciplinasMescladas.filter(
    (d) => Number(d.instituicaoId) === Number(user.faculdadeId)
  );

  if (user.tipo === "coordenador") {
    return disciplinasDaFaculdade;
  }

  if (user.tipo === "professor") {
    return disciplinasDaFaculdade.filter(
      (d) => Number(d.professorId) === Number(user.id)
    );
  }

  if (user.tipo === "responsavel") {
    return disciplinasDaFaculdade.filter(
      (d) => Number(d.responsavelId) === Number(user.id)
    );
  }

  if (user.tipo === "aluno") {
    const usuariosDisciplinasOverride = getUsuariosDisciplinasOverride();

    const idsBase = Array.isArray(user.disciplinas)
      ? user.disciplinas.map(Number)
      : [];

    const idsOverride = Array.isArray(
      usuariosDisciplinasOverride[String(user.id)]
    )
      ? usuariosDisciplinasOverride[String(user.id)].map(Number)
      : [];

    const ids = [...new Set([...idsBase, ...idsOverride])];

    return disciplinasDaFaculdade.filter((d) => ids.includes(Number(d.id)));
  }

  return [];
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