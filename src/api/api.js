// src/api/api.js
import { createClient } from "@supabase/supabase-js";

/**
 * Ajuste as envs conforme seu bundler:
 * - CRA: process.env.REACT_APP_*
 * - Vite: import.meta.env.VITE_*
 */
const SUPABASE_URL =
  process.env.REACT_APP_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.REACT_APP_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Supabase env não carregou. Verifique SUPABASE_URL e SUPABASE_ANON_KEY no .env/.env.local."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper padrão para tratar erros do Supabase
 */
function assertOk({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

/* =========================
   INSTITUICOES
========================= */

export async function listInstituicoes() {
  const res = await supabase
    .from("instituicoes")
    .select("*")
    .order("id", { ascending: true });

  return assertOk(res);
}

export async function getInstituicaoById(id) {
  const res = await supabase
    .from("instituicoes")
    .select("*")
    .eq("id", id)
    .single();

  return assertOk(res);
}

/* =========================
   USUARIOS (tabela custom)
   OBS: coluna "user" é reservada; no supabase client ela funciona como "user"
========================= */

export async function getUsuarioById(id) {
  const res = await supabase
    .from("usuarios")
    .select('id, user, nome, contato, tipo, faculdade_id, cria_eventos, lista_aluno, gerenciar_responsavel')
    .eq("id", id)
    .single();

  return assertOk(res);
}

/**
 * Login "manual" (SEM Supabase Auth)
 * Atenção: isso expõe a senha se RLS permitir select.
 * Em produção, o recomendado é usar Supabase Auth + policies.
 */
export async function loginUsuarioManual(user, senha) {
  const res = await supabase
    .from("usuarios")
    .select("id, user, nome, contato, tipo, faculdade_id, cria_eventos, lista_aluno, gerenciar_responsavel")
    .eq("user", user)
    .eq("senha", senha)
    .maybeSingle();

  const data = assertOk(res);
  // Se não achou, data = null
  return data;
}

/* =========================
   DISCIPLINAS
========================= */

export async function listDisciplinas({ instituicaoId } = {}) {
  let q = supabase
    .from("disciplinas")
    .select("*")
    .order("id", { ascending: true });

  if (instituicaoId != null) q = q.eq("instituicao_id", instituicaoId);

  const res = await q;
  return assertOk(res);
}

export async function getDisciplinaById(id) {
  const res = await supabase
    .from("disciplinas")
    .select("*")
    .eq("id", id)
    .single();

  return assertOk(res);
}

/* =========================
   EVENTOS (CRUD)
========================= */

export async function listEventos({
  instituicaoId,
  disciplinaId,
  destaque,
  calendario,
  limit = 100,
} = {}) {
  let q = supabase
    .from("eventos")
    .select("*")
    .order("ultima_atualizacao", { ascending: false })
    .limit(limit);

  if (instituicaoId != null) q = q.eq("instituicao_id", instituicaoId);
  if (disciplinaId != null) q = q.eq("disciplina_id", disciplinaId);
  if (destaque != null) q = q.eq("destaque", destaque);
  if (calendario != null) q = q.eq("calendario", calendario);

  const res = await q;
  return assertOk(res);
}

export async function getEventoById(id) {
  const res = await supabase
    .from("eventos")
    .select("*")
    .eq("id", id)
    .single();

  return assertOk(res);
}

/**
 * CREATE
 * Observação: ultima_atualizacao é NOT NULL no seu schema.
 * Se você NÃO colocou default now() no banco, você precisa enviar aqui.
 */
export async function createEvento(payload) {
  // payload esperado:
  // { titulo, descricao, criado_por_id, instituicao_id, disciplina_id, calendario, destaque }
  const toInsert = {
    ...payload,
    ultima_atualizacao: payload.ultima_atualizacao ?? new Date().toISOString(),
  };

  const res = await supabase
    .from("eventos")
    .insert(toInsert)
    .select("*")
    .single();

  return assertOk(res);
}

/**
 * UPDATE (parcial)
 * Sempre atualiza ultima_atualizacao
 */
export async function updateEvento(id, patch) {
  const toUpdate = {
    ...patch,
    ultima_atualizacao: new Date().toISOString(),
  };

  const res = await supabase
    .from("eventos")
    .update(toUpdate)
    .eq("id", id)
    .select("*")
    .single();

  return assertOk(res);
}

/**
 * DELETE
 */
export async function deleteEvento(id) {
  const res = await supabase
    .from("eventos")
    .delete()
    .eq("id", id);

  // delete não precisa retornar data
  if (res.error) throw new Error(res.error.message);
  return true;
}

/* =========================
   EVENTOS COM JOIN (opcional)
   Usa as FKs para trazer dados relacionados
========================= */

export async function listEventosCompletos({ instituicaoId, disciplinaId, limit = 100 } = {}) {
  let q = supabase
    .from("eventos")
    .select(`
      id,
      titulo,
      descricao,
      ultima_atualizacao,
      calendario,
      destaque,
      disciplina_id,
      instituicao_id,
      criado_por_id,
      disciplinas ( id, nome, cor ),
      instituicoes ( id, nome, sigla, logo ),
      usuarios ( id, nome, tipo )
    `)
    .order("ultima_atualizacao", { ascending: false })
    .limit(limit);

  if (instituicaoId != null) q = q.eq("instituicao_id", instituicaoId);
  if (disciplinaId != null) q = q.eq("disciplina_id", disciplinaId);

  const res = await q;
  return assertOk(res);
}

/* =========================
   USUARIO_DISCIPLINAS (N:N)
========================= */

export async function listDisciplinasDoUsuario(usuarioId) {
  // retorna linhas da tabela de vínculo + disciplina (join)
  const res = await supabase
    .from("usuario_disciplinas")
    .select(`
      usuario_id,
      disciplina_id,
      disciplinas ( id, nome, cor, instituicao_id, professor_id, responsavel_id )
    `)
    .eq("usuario_id", usuarioId);

  return assertOk(res);
}

export async function addDisciplinaAoUsuario(usuarioId, disciplinaId) {
  const res = await supabase
    .from("usuario_disciplinas")
    .insert({ usuario_id: usuarioId, disciplina_id: disciplinaId });

  if (res.error) throw new Error(res.error.message);
  return true;
}

export async function removeDisciplinaDoUsuario(usuarioId, disciplinaId) {
  const res = await supabase
    .from("usuario_disciplinas")
    .delete()
    .eq("usuario_id", usuarioId)
    .eq("disciplina_id", disciplinaId);

  if (res.error) throw new Error(res.error.message);
  return true;
}
