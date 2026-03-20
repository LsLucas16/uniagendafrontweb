import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import data from "../../data/dados.json";
import chevronIcon from "../../assets/ic_chevron.svg";
import "./VerCalendario.scss";
import { getEventos } from "../../services/eventosStore";

const MESES_PT = [
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

function toDateKey(value) {
  if (!value) return "";

  const raw = String(value).trim();

  // pega direto a parte YYYY-MM-DD do ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function getMondayFirstDay(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = getMondayFirstDay(firstDay.getDay());

  const startDate = new Date(year, month, 1 - startOffset);
  const cells = [];

  // 42 células = 6 semanas completas
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    cells.push({
      key: `${yyyy}-${mm}-${dd}`,
      date: d,
      day: d.getDate(),
      isCurrentMonth: d.getMonth() === month,
    });
  }

  return cells;
}

function isBeforeMonth(a, b) {
  return (
    a.getFullYear() < b.getFullYear() ||
    (a.getFullYear() === b.getFullYear() && a.getMonth() < b.getMonth())
  );
}

function isSameMonth(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth()
  );
}

export default function VerCalendario() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
  const onEventosChanged = () => setRefreshKey((k) => k + 1);

  window.addEventListener("eventos:changed", onEventosChanged);
  window.addEventListener("storage", onEventosChanged);

  return () => {
    window.removeEventListener("eventos:changed", onEventosChanged);
    window.removeEventListener("storage", onEventosChanged);
  };
}, []);

  const mesBase = useMemo(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  }, []);

  const [mesAtual, setMesAtual] = useState(mesBase);

  const eventos = useMemo(() => {
  const baseEventos = Array.isArray(data?.eventos) ? data.eventos : [];
  return getEventos(baseEventos);
}, [refreshKey]);

  const eventosCalendario = useMemo(() => {
    return eventos.filter((evento) => evento.calendario);
  }, [eventos]);

  const eventosPorDia = useMemo(() => {
    const mapa = {};

    eventosCalendario.forEach((evento) => {
      const key = toDateKey(evento.dataEvento);
      if (!key) return;

      if (!mapa[key]) {
        mapa[key] = [];
      }

      mapa[key].push(evento);
    });

    return mapa;
  }, [eventosCalendario]);

  const year = mesAtual.getFullYear();
  const month = mesAtual.getMonth();

  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);

  const isMesAtualReal = isSameMonth(mesAtual, mesBase);

  function handlePrevMonth() {
    const prevMonth = new Date(
      mesAtual.getFullYear(),
      mesAtual.getMonth() - 1,
      1
    );

    if (isBeforeMonth(prevMonth, mesBase)) return;

    setMesAtual(prevMonth);
  }

  function handleNextMonth() {
    setMesAtual(
      new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1)
    );
  }

  function handleOpenDay(dateKey) {
    const eventosDoDia = eventosPorDia[dateKey] || [];
    if (!eventosDoDia.length) return;

    navigate(`/detalhe-calendario/${dateKey}`, {
      state: {
        dataSelecionada: dateKey,
        eventos: eventosDoDia,
      },
    });
  }

  return (
    <div className="ver-calendario-page">
      <section className="ver-calendario-card ver-calendario-card--title">
        <h1 className="page-title">Calendário</h1>
      </section>

      <section className="ver-calendario-card ver-calendario-card--calendar">
        <div className="calendar-header">
          <div className="calendar-header__nav">
            <button
              type="button"
              className="month-nav month-nav--prev"
              aria-label="Mês anterior"
              onClick={handlePrevMonth}
              disabled={isMesAtualReal}
            >
              <img src={chevronIcon} alt="" />
            </button>

            <h2>
              {MESES_PT[month]} {year}
            </h2>

            <button
              type="button"
              className="month-nav month-nav--next"
              aria-label="Próximo mês"
              onClick={handleNextMonth}
            >
              <img src={chevronIcon} alt="" />
            </button>
          </div>
        </div>

        <div className="calendar-weekdays">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="weekday">
              {dia}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {days.map((item) => {
            const eventosDoDia = eventosPorDia[item.key] || [];
            const eventosCount = eventosDoDia.length;
            const isClickable = eventosCount > 0 && item.isCurrentMonth;

            return (
              <button
                key={item.key}
                type="button"
                className={`calendar-cell ${item.isCurrentMonth ? "" : "is-outside"} ${
                  isClickable ? "is-clickable" : ""
                }`}
                onClick={() => handleOpenDay(item.key)}
                disabled={!isClickable}
              >
                <div className="calendar-cell__top">
                  <span className="day-number">{item.day}</span>

                  {eventosCount > 0 && (
                    <span className="events-badge">+{eventosCount}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}