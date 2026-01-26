// src/services/eventosStore.js
const STORAGE_KEY = "eventos_override_v1";

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}
function writeMap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getEventos(baseEventos = []) {
  const map = readMap();
  const removed = new Set(map._removed || []);
  const upserts = map._upserts || {};

  const merged = baseEventos
    .filter((e) => !removed.has(e.id))
    .map((e) => (upserts[e.id] ? upserts[e.id] : e));

  const novos = Object.values(upserts).filter(
    (e) => !baseEventos.some((b) => b.id === e.id),
  );

  return [...merged, ...novos].sort((a, b) => (a.id - b.id));
}

export function nextEventoId(baseEventos = []) {
  const eventos = getEventos(baseEventos);
  const maxId = eventos.reduce(
    (acc, e) => Math.max(acc, Number(e.id) || 0),
    0,
  );
  return maxId + 1;
}

export function upsertEvento(evento) {
  const map = readMap();
  map._upserts = map._upserts || {};
  map._removed = map._removed || [];

  // se estava removido, desmarca
  map._removed = map._removed.filter((id) => id !== evento.id);

  map._upserts[evento.id] = evento;
  writeMap(map);
}

export function deleteEvento(id) {
  const map = readMap();
  map._upserts = map._upserts || {};
  map._removed = map._removed || [];

  delete map._upserts[id];
  if (!map._removed.includes(id)) map._removed.push(id);

  writeMap(map);
}
