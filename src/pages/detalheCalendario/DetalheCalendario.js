import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dados from "../../data/dados.json";
import "./DetalheCalendario.scss";

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function parseLocalDateFromISO(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateParam(dateParam) {
  if (!dateParam) return null;

  const [year, month, day] = String(dateParam).split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHeaderDate(date) {
  if (!date) return "";

  const dia = String(date.getDate()).padStart(2, "0");
  const mes = String(date.getMonth() + 1).padStart(2, "0");

  const diasSemana = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  return `${dia}/${mes} - ${diasSemana[date.getDay()]}`;
}

function getCriadorNome(criadoPorId, usuarios = []) {
  const usuario = usuarios.find((u) => Number(u.id) === Number(criadoPorId));
  return usuario?.nome || "Usuário não identificado";
}

function getDisciplinaIdsDoEvento(evento) {
  if (Array.isArray(evento?.disciplinaIds) && evento.disciplinaIds.length > 0) {
    return evento.disciplinaIds
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  if (Number.isFinite(Number(evento?.disciplinaId))) {
    return [Number(evento.disciplinaId)];
  }

  return [];
}

function getDisciplinasNome(evento, disciplinas = []) {
  const ids = getDisciplinaIdsDoEvento(evento);

  if (!ids.length) return "Disciplina não informada";

  const nomes = ids.map((id) => {
    const disciplina = disciplinas.find((d) => Number(d.id) === Number(id));
    return disciplina?.nome || `Turma ${id}`;
  });

  return nomes.join("   ");
}

function getBarColor(evento, disciplinas = []) {
  const ids = getDisciplinaIdsDoEvento(evento);

  if (ids.length === 1) {
    const disciplina = disciplinas.find((d) => Number(d.id) === Number(ids[0]));
    if (disciplina?.cor) return disciplina.cor;
  }

  if (evento.destaque) return "#E97D7D";
  if (evento.calendario) return "#6FA8DC";
  return "#9AD18B";
}

export default function DetalheCalendario() {
  const navigate = useNavigate();
  const { date } = useParams();

  const [busca, setBusca] = useState("");

  const usuarios = Array.isArray(dados.usuarios) ? dados.usuarios : [];
  const disciplinas = Array.isArray(dados.disciplinas || dados.diciplinas)
    ? dados.disciplinas || dados.diciplinas
    : [];
  const eventos = Array.isArray(dados.eventos) ? dados.eventos : [];

  const dataSelecionada = useMemo(() => parseDateParam(date), [date]);

  const eventosDoDia = useMemo(() => {
    if (!dataSelecionada) return [];

    const termo = norm(busca);

    return eventos
      .filter((evento) => {
        const dataEvento = parseLocalDateFromISO(evento.dataEvento);
        return sameDay(dataEvento, dataSelecionada);
      })
      .map((evento) => ({
        ...evento,
        criadorNome: getCriadorNome(evento.criadoPorId, usuarios),
        disciplinaNome: getDisciplinasNome(evento, disciplinas),
        barColor: getBarColor(evento, disciplinas),
      }))
      .filter((evento) => {
        if (!termo) return true;

        return (
          norm(evento.titulo).includes(termo) ||
          norm(evento.descricao).includes(termo) ||
          norm(evento.criadorNome).includes(termo) ||
          norm(evento.disciplinaNome).includes(termo)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.ultimaAtualizacao || a.dataEvento || 0).getTime();
        const dateB = new Date(b.ultimaAtualizacao || b.dataEvento || 0).getTime();
        return dateB - dateA;
      });
  }, [eventos, usuarios, disciplinas, dataSelecionada, busca]);

  return (
    <div className="detalhe-calendario-page">
      <section className="detalhe-calendario-card detalhe-calendario-card--title">
        <h1 className="detalhe-calendario-title">Calendário</h1>
      </section>

      <section className="detalhe-calendario-card detalhe-calendario-card--lista">
        <div className="detalhe-calendario-header">
          <button
            type="button"
            className="detalhe-calendario-back"
            onClick={() => navigate("/ver-calendario")}
          >
            ← Voltar
          </button>

          <h2>{formatHeaderDate(dataSelecionada)}</h2>
        </div>

        <div className="detalhe-calendario-list">
          {eventosDoDia.length > 0 ? (
            eventosDoDia.map((evento) => (
              <article key={evento.id} className="detalhe-evento-card">
                <div
                  className="detalhe-evento-card__bar"
                  style={{ backgroundColor: evento.barColor }}
                />

                <div className="detalhe-evento-card__content">
                  <div className="detalhe-evento-card__top">
                    <h3>{evento.titulo}</h3>

                    <span className="detalhe-evento-card__disciplina">
                      {evento.disciplinaNome}
                    </span>
                  </div>

                  <div className="detalhe-evento-card__autor">
                    Criado por: {evento.criadorNome}
                  </div>

                  <p className="detalhe-evento-card__descricao">
                    {evento.descricao}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="detalhe-calendario-empty">
              Nenhum evento encontrado para esta data.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}