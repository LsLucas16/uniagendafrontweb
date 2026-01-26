import React, { useEffect, useMemo, useState, forwardRef } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import ptBR from "date-fns/locale/pt-BR";
import Swal from "sweetalert2";
import { Calendar } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import { ReactComponent as ArrowLeftIcon } from "../../assets/seta.svg";
import dados from "../../data/dados.json";
import "./EditarEvento.scss";

import { getEventos, upsertEvento, deleteEvento } from "../../services/eventosStore";

registerLocale("pt-BR", ptBR);

const TITULO_MAX = 60;
const DESCRICAO_MAX = 800;

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function parseDataEvento(ev) {
  if (!ev) return null;

  const raw =
    ev.dataEvento ??
    ev.data ??
    ev.dataInicio ??
    ev.data_inicio ??
    ev.inicio ??
    ev.startDate ??
    null;

  if (!raw) return null;

  const isoTry = new Date(raw);
  if (!Number.isNaN(isoTry.getTime())) return isoTry;

  if (typeof raw === "string" && raw.includes("/")) {
    const [dd, mm, yyyy] = raw.split("/").map(Number);
    if (dd && mm && yyyy) {
      const dt = new Date(yyyy, mm - 1, dd);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
  }

  return null;
}

const EditarEvento = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [startDate, setStartDate] = useState(null);

  const tituloCount = useMemo(() => titulo.length, [titulo]);
  const descricaoCount = useMemo(() => descricao.length, [descricao]);

  const [notificacoes, setNotificacoes] = useState({
    calendario: true,
    destaque: false,
  });

  const usuarioLogado = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuario")) || null;
    } catch {
      return null;
    }
  }, []);

  // 🔹 Busca evento final (base + overrides) pelo id
  const getEventoAtual = () => {
    const baseEventos = Array.isArray(dados.eventos) ? dados.eventos : [];
    const todos = getEventos(baseEventos);
    return todos.find((e) => String(e.id) === String(id)) || null;
  };

  useEffect(() => {
    const evento = getEventoAtual();

    if (!evento) {
      Swal.fire({
        title: "Evento não encontrado",
        text: "Não foi possível localizar este evento.",
        icon: "error",
        confirmButtonText: "Fechar",
        confirmButtonColor: "#2E4A67",
      }).then(() => navigate("/eventos"));
      return;
    }

    // ✅ mantém sua regra: só entra aqui se o evento for calendário
    if (!evento.calendario) {
      Swal.fire({
        title: "Ação não permitida",
        text: "Este evento não pode ser editado porque não é um evento de calendário.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#2E4A67",
      }).then(() => navigate("/eventos"));
      return;
    }

    if (
      usuarioLogado?.faculdadeId &&
      evento.instituicaoId !== usuarioLogado.faculdadeId
    ) {
      Swal.fire({
        title: "Acesso negado",
        text: "Você não tem permissão para editar este evento.",
        icon: "error",
        confirmButtonText: "Fechar",
        confirmButtonColor: "#2E4A67",
      }).then(() => navigate("/eventos"));
      return;
    }

    setTitulo(evento.titulo || "");
    setDescricao(evento.descricao || "");

    setNotificacoes({
      calendario: !!evento.calendario, // inicia com o que existe
      destaque: !!evento.destaque,
    });

    setStartDate(parseDataEvento(evento));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, usuarioLogado]);

  const handleSalvar = async () => {
    if (!titulo.trim()) {
      Swal.fire({
        title: "Campos obrigatórios",
        text: "Por favor, preencha o título do evento.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#2E4A67",
      });
      return;
    }

    if (!descricao.trim()) {
      Swal.fire({
        title: "Campos obrigatórios",
        text: "Por favor, preencha a descrição do evento.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#2E4A67",
      });
      return;
    }

    if (notificacoes.calendario && !startDate) {
      Swal.fire({
        title: "Campos obrigatórios",
        text: "Selecione a data do evento para aviso no calendário.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#2E4A67",
      });
      return;
    }

    try {
      Swal.fire({
        title: "Salvando alterações...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // opcional: simular latência
      await new Promise((resolve) => setTimeout(resolve, 600));

      const original = getEventoAtual();
      if (!original) throw new Error("Evento não encontrado");

      const agoraISO = new Date().toISOString();

      const dataEventoISO =
        notificacoes.calendario && startDate
          ? new Date(
              startDate.getFullYear(),
              startDate.getMonth(),
              startDate.getDate(),
            ).toISOString()
          : null;

      const atualizado = {
        ...original,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        calendario: !!notificacoes.calendario,
        destaque: !!notificacoes.destaque,
        ...(dataEventoISO ? { dataEvento: dataEventoISO } : {}),
        // Se desligou calendário, remova a dataEvento do objeto final
        ...(dataEventoISO ? {} : { dataEvento: undefined }),
        ultimaAtualizacao: agoraISO,
      };

      // remove campos undefined antes de salvar
      Object.keys(atualizado).forEach((k) => {
        if (atualizado[k] === undefined) delete atualizado[k];
      });

      upsertEvento(atualizado);

      Swal.fire({
        title: "Sucesso!",
        text: "As alterações foram salvas.",
        icon: "success",
        confirmButtonText: "Ótimo",
        confirmButtonColor: "#2E4A67",
      }).then(() => navigate("/eventos"));
    } catch (error) {
      Swal.fire({
        title: "Erro ao salvar",
        text: "Não foi possível salvar as alterações. Tente novamente em instantes.",
        icon: "error",
        confirmButtonText: "Fechar",
        confirmButtonColor: "#d33",
      });
    }
  };

  const handleExcluir = async () => {
    const confirm = await Swal.fire({
      title: "Excluir evento?",
      text: "Essa ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#2E4A67",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    try {
      const original = getEventoAtual();
      if (!original) {
        Swal.fire({
          title: "Evento não encontrado",
          text: "Esse evento já não está disponível.",
          icon: "info",
          confirmButtonColor: "#2E4A67",
        }).then(() => navigate("/eventos"));
        return;
      }

      deleteEvento(original.id);

      Swal.fire({
        title: "Excluído",
        text: "O evento foi excluído com sucesso.",
        icon: "success",
        confirmButtonText: "Ok",
        confirmButtonColor: "#2E4A67",
      }).then(() => navigate("/eventos"));
    } catch {
      Swal.fire({
        title: "Erro ao excluir",
        text: "Não foi possível excluir o evento. Tente novamente.",
        icon: "error",
        confirmButtonText: "Fechar",
        confirmButtonColor: "#d33",
      });
    }
  };

  const InputDataComIcone = forwardRef(
    ({ value, onClick, placeholder }, ref) => {
      return (
        <button
          type="button"
          className="date-input"
          onClick={onClick}
          ref={ref}
        >
          <span className="date-input__icon" aria-hidden="true">
            <Calendar size={16} />
          </span>

          <span
            className={value ? "date-input__value" : "date-input__placeholder"}
          >
            {value || placeholder}
          </span>
        </button>
      );
    },
  );

  return (
    <div className="painel-evento editar-evento">
      <div className="editar-wrapper">
        <div className="editar-topbar">
          <button
            type="button"
            className="btn-voltar"
            onClick={() => navigate(-1)}
          >
            <span className="btn-voltar__seta" aria-hidden="true">
              <ArrowLeftIcon className="icon-arrow" />
            </span>
            <span>Voltar</span>
          </button>
        </div>

        <div className="card-form">
          <h1 className="titulo-sessao">Editar evento</h1>

          <div className="formulario">
            <div className="campo">
              <label className="titulo-evento">Título</label>
              <input
                type="text"
                placeholder="Digite o título do evento"
                className="input-estilizado"
                value={titulo}
                maxLength={TITULO_MAX}
                onChange={(e) => {
                  const raw = e.target.value || "";
                  const limited = raw.slice(0, TITULO_MAX);
                  setTitulo(capitalizeFirst(limited));
                }}
                required
              />
              <div className="contador-campo">
                {tituloCount}/{TITULO_MAX}
              </div>
            </div>

            <div className="campo">
              <label>Descrição</label>
              <textarea
                rows="10"
                placeholder="Descreva os detalhes do evento"
                className="input-estilizado"
                value={descricao}
                maxLength={DESCRICAO_MAX}
                onChange={(e) => {
                  const raw = e.target.value || "";
                  setDescricao(raw.slice(0, DESCRICAO_MAX));
                }}
                required
              />
              <div className="contador-campo">
                {descricaoCount}/{DESCRICAO_MAX}
              </div>
            </div>

            <div className="campo">
              <label className="label-notificacao">Tipo de notificação</label>

              <div className="opcoes-bolinha">
                <div
                  className="item-bolinha"
                  onClick={() => {
                    setNotificacoes((prev) => {
                      const nextCalendario = !prev.calendario;
                      if (!nextCalendario) setStartDate(null);
                      return { ...prev, calendario: nextCalendario };
                    });
                  }}
                  role="checkbox"
                  aria-checked={notificacoes.calendario}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setNotificacoes((prev) => {
                        const nextCalendario = !prev.calendario;
                        if (!nextCalendario) setStartDate(null);
                        return { ...prev, calendario: nextCalendario };
                      });
                    }
                  }}
                >
                  <div
                    className={`circular-check ${
                      notificacoes.calendario ? "active" : ""
                    }`}
                  />
                  <span>Aviso no calendário</span>
                </div>

                <div
                  className="item-bolinha"
                  onClick={() =>
                    setNotificacoes((prev) => ({
                      ...prev,
                      destaque: !prev.destaque,
                    }))
                  }
                  role="checkbox"
                  aria-checked={notificacoes.destaque}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setNotificacoes((prev) => ({
                        ...prev,
                        destaque: !prev.destaque,
                      }));
                    }
                  }}
                >
                  <div
                    className={`circular-check ${
                      notificacoes.destaque ? "active" : ""
                    }`}
                  />
                  <span>Aviso em destaque</span>
                </div>
              </div>
            </div>

            {notificacoes.calendario && (
              <div className="campo">
                <label>Data do evento</label>

                <div className="input-calendario-wrapper">
                  <DatePicker
                    fixedHeight
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    locale="pt-BR"
                    dateFormat="dd/MM/yyyy"
                    minDate={new Date()}
                    placeholderText="Escolha uma data"
                    customInput={
                      <InputDataComIcone placeholder="Escolha uma data" />
                    }
                    calendarClassName="calendario-customizado"
                    popperClassName="popper-calendario"
                    showPopperArrow={false}
                    renderCustomHeader={({
                      date,
                      decreaseMonth,
                      increaseMonth,
                    }) => {
                      const hoje = new Date();
                      const firstOfCurrentMonth = new Date(
                        hoje.getFullYear(),
                        hoje.getMonth(),
                        1,
                      );
                      const firstOfShownMonth = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        1,
                      );
                      const prevDisabled =
                        firstOfShownMonth <= firstOfCurrentMonth;

                      return (
                        <div className="cal-header cal-header--figma">
                          <button
                            type="button"
                            className={`cal-nav cal-nav--figma ${
                              prevDisabled ? "is-disabled" : ""
                            }`}
                            onClick={() => {
                              if (!prevDisabled) decreaseMonth();
                            }}
                            aria-label="Mês anterior"
                            disabled={prevDisabled}
                          >
                            ‹
                          </button>

                          <div className="cal-title cal-title--figma">
                            {date
                              .toLocaleDateString("pt-BR", {
                                month: "long",
                                year: "numeric",
                              })
                              .replace(/^./, (c) => c.toUpperCase())}
                          </div>

                          <button
                            type="button"
                            className="cal-nav cal-nav--figma"
                            onClick={increaseMonth}
                            aria-label="Próximo mês"
                          >
                            ›
                          </button>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            )}

            <div className="container-btn">
              <button className="btn-publicar" onClick={handleSalvar}>
                Salvar alterações
              </button>

              <button
                type="button"
                className="btn-excluir"
                onClick={handleExcluir}
              >
                Excluir evento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditarEvento;
