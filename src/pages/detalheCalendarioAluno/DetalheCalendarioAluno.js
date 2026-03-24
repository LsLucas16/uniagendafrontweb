import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dados from "../../data/dados.json";
import "./DetalheCalendarioAluno.scss";

const STORAGE_EVENTOS = "eventos_override";
const STORAGE_DISCIPLINAS = "disciplinas_override";
const STORAGE_USUARIO = "usuario";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

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

function getStorageArray(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  const parsed = safeParse(raw, fallback);
  return Array.isArray(parsed) ? parsed : fallback;
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
    date.getMonth() + 1,
  ).padStart(2, "0")} - ${DIAS[date.getDay()]}`;
}

function formatUpdate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function DetalheCalendarioAluno() {
  const navigate = useNavigate();
  const { data } = useParams();

  const usuarioLogado = getUsuarioLogado();
  const alunoId = Number(usuarioLogado?.id) || 101;

  const disciplinasJson = Array.isArray(dados?.disciplinas)
    ? dados.disciplinas
    : [];
  const eventosJson = Array.isArray(dados?.eventos) ? dados.eventos : [];

  const disciplinasStorage = getStorageArray(STORAGE_DISCIPLINAS, []);
  const eventosStorage = getStorageArray(STORAGE_EVENTOS, []);

  const disciplinasBase = disciplinasStorage.length
    ? disciplinasStorage
    : disciplinasJson;
  const eventosBase = eventosStorage.length ? eventosStorage : eventosJson;

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
            Array.isArray(disc.alunoIds) && disc.alunoIds.includes(alunoId),
        )
        .map((disc) => Number(disc.id)),
    );
  }, [disciplinasBase, alunoId]);

  const dataSelecionada = useMemo(() => parseISODateOnly(data), [data]);
  const dateKey = useMemo(
    () => (dataSelecionada ? toDateKey(dataSelecionada) : ""),
    [dataSelecionada],
  );

  const eventosDaData = useMemo(() => {
    return eventosBase
      .filter((evento) => {
        if (!evento?.calendario) return false;

        const eventoDate = parseLocalDate(evento.dataEvento);
        if (!eventoDate) return false;
        if (toDateKey(eventoDate) !== dateKey) return false;

        const ids = Array.isArray(evento.disciplinaIds)
          ? evento.disciplinaIds
          : [];
        return ids.some((id) => disciplinaIdsDoAluno.has(Number(id)));
      })
      .map((evento) => {
        const disciplinasRelacionadas = (evento.disciplinaIds || [])
          .filter((id) => disciplinaIdsDoAluno.has(Number(id)))
          .map((id) => disciplinaMap.get(Number(id)))
          .filter(Boolean);

        const primeiraDisciplina = disciplinasRelacionadas[0] || null;
        const criadoPor = usuarioMap.get(Number(evento.criadoPorId));

        return {
          ...evento,
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
  }, [eventosBase, dateKey, disciplinaIdsDoAluno, disciplinaMap, usuarioMap]);

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
            ← Voltar
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
            eventosDaData.map((evento) => (
              <article key={evento.id} className="evento-card-aluno">
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

                {evento.disciplinasRelacionadas.length > 1 && (
                  <div className="evento-card-aluno__tags">
                    {evento.disciplinasRelacionadas.map((disciplina) => (
                      <span
                        key={disciplina.id}
                        className="evento-card-aluno__tag"
                        style={{
                          borderColor: disciplina.cor || "#d9dee5",
                          color: disciplina.cor || "#6b7280",
                        }}
                      >
                        {disciplina.nome}
                      </span>
                    ))}
                  </div>
                )}

                <div className="evento-card-aluno__footer">
                  <button type="button" className="evento-card-aluno__action">
                    ✓ Marcar como visto
                  </button>

                  <button type="button" className="evento-card-aluno__action">
                    ⏲ Agendar lembrete
                  </button>

                  <span className="evento-card-aluno__updated">
                    Atualizado em {formatUpdate(evento.ultimaAtualizacao)}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
