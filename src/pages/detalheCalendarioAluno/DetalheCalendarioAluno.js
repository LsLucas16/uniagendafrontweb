import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dados from "../../data/dados.json";
import "./DetalheCalendarioAluno.scss";
import { ArrowLeft } from "lucide-react";

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

const STORAGE_USUARIO = "usuario";
const STORAGE_EVENTOS_VISTOS = "eventos_vistos_aluno";

const DIAS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getStorageArray(key, fallback = []) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  const parsed = safeParse(raw, fallback);
  return Array.isArray(parsed) ? parsed : fallback;
}

function getFirstStorageArray(keys, fallback = []) {
  for (const key of keys) {
    const parsed = getStorageArray(key, []);
    if (parsed.length) return parsed;
  }
  return fallback;
}

function getAllStorageArrays(keys) {
  const all = [];

  keys.forEach((key) => {
    const parsed = getStorageArray(key, []);
    if (parsed.length) {
      all.push(...parsed);
    }
  });

  return all;
}

function getUsuarioLogado() {
  const raw = localStorage.getItem(STORAGE_USUARIO);
  if (!raw) return null;
  return safeParse(raw, null);
}

function parseISODateOnly(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function parseLocalDate(value) {
  if (!value) return null;

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;

  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatHeaderDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")} - ${DIAS[date.getDay()]}`;
}

function getEventosVistos() {
  return safeParse(localStorage.getItem(STORAGE_EVENTOS_VISTOS), {});
}

function salvarEventosVistos(payload) {
  localStorage.setItem(STORAGE_EVENTOS_VISTOS, JSON.stringify(payload));
  window.dispatchEvent(new Event("eventosVistos:changed"));
}

function normalizarIdsEvento(evento) {
  if (Array.isArray(evento?.disciplinaIds)) {
    return evento.disciplinaIds.map(Number).filter(Boolean);
  }

  if (evento?.disciplinaId !== undefined && evento?.disciplinaId !== null && evento?.disciplinaId !== "") {
    return [Number(evento.disciplinaId)].filter(Boolean);
  }

  return [];
}

function eventoPertenceAoAluno(evento, disciplinaIdsDoAluno, disciplinasBase, usuarioLogado) {
  const ids = normalizarIdsEvento(evento);

  if (ids.some((id) => disciplinaIdsDoAluno.has(Number(id)))) {
    return true;
  }

  if (String(evento?.destino || "").toLowerCase() === "todas") {
    return Number(evento?.instituicaoId) === Number(usuarioLogado?.faculdadeId);
  }

  if (String(evento?.destino || "").toLowerCase() === "varias") {
    return ids.some((id) => disciplinaIdsDoAluno.has(Number(id)));
  }

  if (String(evento?.destino || "").toLowerCase() === "uma") {
    return ids.some((id) => disciplinaIdsDoAluno.has(Number(id)));
  }

  return false;
}

function mergeEventos(jsonList, storageList) {
  const map = new Map();

  [...(Array.isArray(jsonList) ? jsonList : []), ...(Array.isArray(storageList) ? storageList : [])]
    .forEach((item, index) => {
      if (!item) return;

      const hasId = item.id !== undefined && item.id !== null && item.id !== "";
      const key = hasId
        ? `id:${String(item.id)}`
        : `sem-id:${String(item.titulo || "")}:${String(item.dataEvento || "")}:${index}`;

      map.set(key, {
        ...item,
        disciplinaIds: normalizarIdsEvento(item),
      });
    });

  return Array.from(map.values());
}

export default function DetalheCalendarioAluno() {
  const navigate = useNavigate();
  const { data } = useParams();

  const usuarioLogado = getUsuarioLogado();
  const alunoId = Number(usuarioLogado?.id) || 101;

  const [eventosVistos, setEventosVistos] = useState({});

  useEffect(() => {
    const sync = () => setEventosVistos(getEventosVistos());

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("eventosVistos:changed", sync);
    window.addEventListener("eventos:changed", sync);
    window.addEventListener("app:data-changed", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("eventosVistos:changed", sync);
      window.removeEventListener("eventos:changed", sync);
      window.removeEventListener("app:data-changed", sync);
    };
  }, []);

  const disciplinasJson = Array.isArray(dados?.disciplinas) ? dados.disciplinas : [];
  const eventosJson = Array.isArray(dados?.eventos) ? dados.eventos : [];

  const disciplinasStorage = useMemo(
    () => getFirstStorageArray(STORAGE_DISCIPLINAS_KEYS, []),
    []
  );

  const eventosStorage = useMemo(
    () => getAllStorageArrays(STORAGE_EVENTOS_KEYS),
    []
  );

  const disciplinasBase = disciplinasStorage.length ? disciplinasStorage : disciplinasJson;

  const eventosBase = useMemo(() => {
    return mergeEventos(eventosJson, eventosStorage);
  }, [eventosJson, eventosStorage]);

  const usuarioMap = useMemo(() => {
    const map = new Map();
    (dados?.usuarios || []).forEach((usuario) => {
      map.set(Number(usuario.id), usuario);
    });
    return map;
  }, []);

  const disciplinaMap = useMemo(() => {
    const map = new Map();
    disciplinasBase.forEach((disciplina) => {
      map.set(Number(disciplina.id), disciplina);
    });
    return map;
  }, [disciplinasBase]);

  const disciplinaIdsDoAluno = useMemo(() => {
    return new Set(
      disciplinasBase
        .filter(
          (disc) =>
            Array.isArray(disc.alunoIds) &&
            disc.alunoIds.map(Number).includes(alunoId)
        )
        .map((disc) => Number(disc.id))
    );
  }, [disciplinasBase, alunoId]);

  const dataSelecionada = useMemo(() => parseISODateOnly(data), [data]);

  const dateKey = useMemo(
    () => (dataSelecionada ? toDateKey(dataSelecionada) : ""),
    [dataSelecionada]
  );

  const eventosDaData = useMemo(() => {
    return eventosBase
      .filter((evento) => {
        if (!evento?.calendario) return false;

        const eventoDate = parseLocalDate(evento.dataEvento);
        if (!eventoDate) return false;
        if (toDateKey(eventoDate) !== dateKey) return false;

        return eventoPertenceAoAluno(
          evento,
          disciplinaIdsDoAluno,
          disciplinasBase,
          usuarioLogado
        );
      })
      .map((evento) => {
        const idsRelacionados = normalizarIdsEvento(evento).filter((id) =>
          disciplinaIdsDoAluno.has(Number(id))
        );

        const disciplinasRelacionadas = idsRelacionados
          .map((id) => disciplinaMap.get(Number(id)))
          .filter(Boolean);

        const primeiraDisciplina = disciplinasRelacionadas[0] || null;
        const criadoPor = usuarioMap.get(Number(evento.criadoPorId));

        const visto = Boolean(eventosVistos?.[alunoId]?.[String(evento.id)]);

        return {
          ...evento,
          visto,
          disciplinaPrincipal: primeiraDisciplina,
          disciplinasRelacionadas,
          criadoPorNome: criadoPor?.nome || "Não informado",
        };
      })
      .sort((a, b) => {
        const da = new Date(a.ultimaAtualizacao).getTime() || 0;
        const db = new Date(b.ultimaAtualizacao).getTime() || 0;
        return db - da;
      });
  }, [
    eventosBase,
    dateKey,
    disciplinaIdsDoAluno,
    disciplinasBase,
    disciplinaMap,
    usuarioMap,
    eventosVistos,
    alunoId,
    usuarioLogado,
  ]);

  function handleMarcarComoVisto(eventoId) {
    const atual = getEventosVistos();

    const proximo = {
      ...atual,
      [alunoId]: {
        ...(atual[alunoId] || {}),
        [String(eventoId)]: true,
      },
    };

    salvarEventosVistos(proximo);
    setEventosVistos(proximo);
  }

  if (!dataSelecionada) {
    return (
      <div className="detalhe-calendario-aluno-page">
        <div className="detalhe-calendario-aluno detalhe-calendario-aluno--empty">
          Data inválida.
        </div>
      </div>
    );
  }

  return (
    <div className="detalhe-calendario-aluno-page">
      <div className="detalhe-calendario-aluno">
        <div className="detalhe-calendario-aluno__topbar">
          <button
            type="button"
            className="detalhe-calendario-aluno__back"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={16} strokeWidth={3} />
            <span className="detalhe-calendario-aluno__backText">Voltar</span>
          </button>

          <h1 className="detalhe-calendario-aluno__title">
            {formatHeaderDate(dataSelecionada)}
          </h1>
        </div>

        <div className="detalhe-calendario-aluno__divider" />

        <div className="detalhe-calendario-aluno__list">
          {eventosDaData.length === 0 ? (
            <div className="detalhe-calendario-aluno__empty">
              Nenhum evento encontrado para esta data.
            </div>
          ) : (
            eventosDaData.map((evento, index) => (
              <article
                key={`${evento.id || evento.titulo}-${index}`}
                className={`evento-card-aluno ${
                  evento.visto ? "evento-card-aluno--visto" : ""
                }`}
              >
                <div className="evento-card-aluno__header">
                  <div className="evento-card-aluno__titleWrap">
                    <h2 className="evento-card-aluno__title">
                      {evento.titulo}
                    </h2>

                    {evento.disciplinaPrincipal && (
                      <span
                        className="evento-card-aluno__badge"
                        style={{
                          backgroundColor:
                            evento.disciplinaPrincipal.cor || "#E9C46A",
                        }}
                      >
                        {evento.disciplinaPrincipal.nome}
                      </span>
                    )}
                  </div>

                  <p className="evento-card-aluno__author">
                    <strong>Criado por:</strong> {evento.criadoPorNome}
                  </p>
                </div>

                <p className="evento-card-aluno__description">
                  {evento.descricao}
                </p>

                <div className="evento-card-aluno__footer">
                  <button
                    type="button"
                    className={`evento-card-aluno__action ${
                      evento.visto
                        ? "evento-card-aluno__action--done"
                        : "evento-card-aluno__action--ghost"
                    }`}
                    onClick={() => handleMarcarComoVisto(evento.id)}
                    disabled={evento.visto}
                  >
                    ✓ {evento.visto ? "Visto" : "Marcar como visto"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}