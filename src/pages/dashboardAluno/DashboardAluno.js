import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dados from "../../data/dados.json";
import "./DashboardAluno.scss";
import chevronIcon from "../../assets/ic_chevron.svg";
import AvisoDestaque from "../../components/AvisoDestaque/AvisoDestaque";

const STORAGE_EVENTOS = "eventos_override";
const STORAGE_TURMAS = "turmas_override";
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

const DIAS_SEMANA = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
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

function getCalendarStart(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = first.getDay();
  const offset = day === 0 ? 6 : day - 1;
  return new Date(first.getFullYear(), first.getMonth(), 1 - offset);
}

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isPastDay(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date < today;
}

function getCorDisciplinaParaUsuario(disciplina, usuarioId) {
  const userId = String(usuarioId || "");
  return disciplina?.coresPorUsuario?.[userId] || disciplina?.cor || "#76A9DA";
}

export default function DashboardAluno() {
  const navigate = useNavigate();

  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const bump = () => setDataVersion((v) => v + 1);

    const onStorage = (e) => {
      if (!e.key) {
        bump();
        return;
      }

      if (
        e.key === STORAGE_TURMAS ||
        e.key === STORAGE_EVENTOS ||
        e.key === STORAGE_USUARIO
      ) {
        bump();
      }
    };

    window.addEventListener("app:data-changed", bump);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("app:data-changed", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const usuarioLogado = useMemo(() => getUsuarioLogado(), [dataVersion]);

  const tipoUsuario = String(usuarioLogado?.tipo || "").toLowerCase();
  const isResponsavel = tipoUsuario === "responsavel";

  const alunoId = Number(usuarioLogado?.id) || 101;

  const disciplinasJson = Array.isArray(dados?.disciplinas)
    ? dados.disciplinas
    : [];
  const eventosJson = Array.isArray(dados?.eventos) ? dados.eventos : [];

  const turmasOverride = useMemo(
    () => getStorageArray(STORAGE_TURMAS, []),
    [dataVersion],
  );

  const eventosStorage = useMemo(
    () => getStorageArray(STORAGE_EVENTOS, []),
    [dataVersion],
  );

  const disciplinasBase = useMemo(() => {
    const mapa = new Map();

    disciplinasJson.forEach((disc) => {
      mapa.set(Number(disc.id), disc);
    });

    turmasOverride.forEach((disc) => {
      mapa.set(Number(disc.id), disc);
    });

    return Array.from(mapa.values());
  }, [disciplinasJson, turmasOverride]);

  const eventosBase = useMemo(() => {
    return eventosStorage.length ? eventosStorage : eventosJson;
  }, [eventosStorage, eventosJson]);

  const hoje = new Date();
  const primeiroDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [mesAtual, setMesAtual] = useState(primeiroDiaMesAtual);

  const disciplinaMap = useMemo(() => {
    const map = new Map();
    disciplinasBase.forEach((disc) => {
      map.set(Number(disc.id), disc);
    });
    return map;
  }, [disciplinasBase]);

  const disciplinaIdsDoAluno = useMemo(() => {
    return new Set(
      disciplinasBase
        .filter((disc) => {
          const alunoIds = Array.isArray(disc.alunoIds)
            ? disc.alunoIds.map(Number)
            : [];
          return alunoIds.includes(alunoId);
        })
        .map((disc) => Number(disc.id)),
    );
  }, [disciplinasBase, alunoId]);

  const eventosDoAluno = useMemo(() => {
    return eventosBase.filter((evento) => {
      if (!evento?.calendario) return false;

      const ids = Array.isArray(evento?.disciplinaIds)
        ? evento.disciplinaIds
        : [];

      return ids.some((id) => disciplinaIdsDoAluno.has(Number(id)));
    });
  }, [eventosBase, disciplinaIdsDoAluno]);

  const eventosPorData = useMemo(() => {
    const map = new Map();

    eventosDoAluno.forEach((evento) => {
      const data = parseLocalDate(evento.dataEvento);
      if (!data) return;

      const key = toDateKey(data);

      if (!map.has(key)) {
        map.set(key, {
          eventos: [],
          dots: [],
        });
      }

      const current = map.get(key);
      current.eventos.push(evento);

      const ids = Array.isArray(evento.disciplinaIds)
        ? evento.disciplinaIds
        : [];

      ids.forEach((disciplinaId) => {
        const disciplinaIdNum = Number(disciplinaId);

        if (!disciplinaIdsDoAluno.has(disciplinaIdNum)) return;

        const disciplina = disciplinaMap.get(disciplinaIdNum);
        if (!disciplina) return;

        if (
          !current.dots.some((item) => item.disciplinaId === disciplinaIdNum)
        ) {
          current.dots.push({
            disciplinaId: disciplinaIdNum,
            cor: getCorDisciplinaParaUsuario(disciplina, alunoId),
            nome: disciplina.nome,
          });
        }
      });
    });

    return map;
  }, [eventosDoAluno, disciplinaIdsDoAluno, disciplinaMap, alunoId]);

  const dias = useMemo(() => {
    const start = getCalendarStart(mesAtual);
    return Array.from({ length: 35 }, (_, index) => addDays(start, index));
  }, [mesAtual]);

  const isMesAtualReal =
    mesAtual.getFullYear() === primeiroDiaMesAtual.getFullYear() &&
    mesAtual.getMonth() === primeiroDiaMesAtual.getMonth();

  function handleNextMonth() {
    setMesAtual((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function handlePrevMonth() {
    if (isMesAtualReal) return;
    setMesAtual((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function handleDayClick(date, canClick) {
    if (!canClick) return;
    navigate(`/detalhe-calendario-aluno/${toDateKey(date)}`);
  }

  return (
    <>
      <AvisoDestaque
        usuario={usuarioLogado}
        disciplinasBase={disciplinasBase}
      />
      <div className="ver-calendario-aluno">
        <div className="ver-calendario-aluno__header">
          <div className="ver-calendario-aluno__titleWrap">
            <button
              type="button"
              className={`ver-calendario-aluno__navBtn ${
                isMesAtualReal ? "is-disabled" : ""
              }`}
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
              disabled={isMesAtualReal}
            >
              <img src={chevronIcon} alt="" className="mes_anterior" />
            </button>

            <h1 className="ver-calendario-aluno__title">
              {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
            </h1>

            <button
              type="button"
              className="ver-calendario-aluno__navBtn"
              onClick={handleNextMonth}
              aria-label="Próximo mês"
            >
              <img src={chevronIcon} alt="" />
            </button>
          </div>

          {isResponsavel && (
            <button
              type="button"
              className="ver-calendario-aluno__plus"
              aria-label="Adicionar"
              onClick={() => navigate("/criar-evento")}
            >
              +
            </button>
          )}
        </div>

        <div className="ver-calendario-aluno__weekdays">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="ver-calendario-aluno__weekday">
              {dia}
            </div>
          ))}
        </div>

        <div className="ver-calendario-aluno__grid">
          {dias.map((dia) => {
            const key = toDateKey(dia);
            const info = eventosPorData.get(key);

            const foraDoMes = !sameMonth(dia, mesAtual);
            const passado = isPastDay(dia);

            const dots = info?.dots || [];
            const visibleDots = dots.slice(0, 4);
            const extraCount = dots.length > 4 ? dots.length - 4 : 0;

            const canClick = !passado && (info?.eventos?.length || 0) > 0;

            return (
              <button
                key={key}
                type="button"
                className={[
                  "ver-calendario-aluno__cell",
                  foraDoMes ? "is-outside" : "",
                  passado ? "is-past" : "",
                  canClick ? "is-clickable" : "",
                  dots.length ? "has-events" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleDayClick(dia, canClick)}
                disabled={!canClick}
              >
                <span className="ver-calendario-aluno__dayNumber">
                  {dia.getDate()}
                </span>

                {dots.length > 0 && (
                  <div className="ver-calendario-aluno__dots">
                    {visibleDots.map((dot) => (
                      <span
                        key={`${key}-${dot.disciplinaId}`}
                        className="ver-calendario-aluno__dot"
                        style={{ backgroundColor: dot.cor }}
                        title={dot.nome}
                      />
                    ))}

                    {extraCount > 0 && (
                      <span className="ver-calendario-aluno__more">
                        +{extraCount}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
