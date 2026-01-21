import React, { useEffect, useMemo, useState, forwardRef } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import ptBR from "date-fns/locale/pt-BR";
import Swal from "sweetalert2";
import { Calendar } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import { ReactComponent as ArrowLeftIcon } from "../../assets/seta.svg";
import data from "../../api/dados.json";
import "./EditarEvento.scss";

registerLocale("pt-BR", ptBR);

/**
 * Enquanto não existe backend:
 * - dados.json é read-only em runtime
 * - então salvamos alterações em localStorage e damos override no evento.
 */
const STORAGE_KEY = "eventos_override";

function getOverrideMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function setOverrideMap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function getEventoById(id) {
  const base = Array.isArray(data.eventos) ? data.eventos : [];
  const override = getOverrideMap();
  return (
    override[String(id)] ||
    base.find((e) => String(e.id) === String(id)) ||
    null
  );
}

const EditarEvento = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [startDate, setStartDate] = useState(null);

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

  // Carrega evento ao abrir a página
  useEffect(() => {
    const evento = getEventoById(id);

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

    // Regra do seu sistema: só pode editar se for calendário
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

    // Segurança: impedir editar evento de outra instituição (opcional, mas recomendado)
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
      calendario: true, // mantém true, pois só existe edição para calendário
      destaque: !!evento.destaque,
    });

    function parseDataEvento(evento) {
      if (!evento) return null;

      // tente nos campos mais prováveis
      const raw =
        evento.dataEvento ??
        evento.data ??
        evento.dataInicio ??
        evento.data_inicio ??
        evento.inicio ??
        evento.startDate ??
        null;

      if (!raw) return null;

      // 1) se já for ISO / Date parseável
      const isoTry = new Date(raw);
      if (!Number.isNaN(isoTry.getTime())) return isoTry;

      // 2) se vier "dd/MM/yyyy"
      if (typeof raw === "string" && raw.includes("/")) {
        const [dd, mm, yyyy] = raw.split("/").map(Number);
        if (dd && mm && yyyy) {
          const dt = new Date(yyyy, mm - 1, dd);
          return Number.isNaN(dt.getTime()) ? null : dt;
        }
      }

      return null;
    }

    setStartDate(parseDataEvento(evento));
  }, [id, navigate, usuarioLogado]);

  const handleSalvar = async () => {
    // Título sempre obrigatório
    if (!titulo) {
      Swal.fire({
        title: "Campos obrigatórios",
        text: "Por favor, preencha o título do evento.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#2E4A67",
      });
      return;
    }

    // Data só é obrigatória se "Aviso no calendário" estiver marcado
    // (no editar, calendario fica sempre true)
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

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const original = getEventoById(id);
      if (!original) throw new Error("Evento não encontrado");

      const atualizado = {
        ...original,
        titulo,
        descricao,
        calendario: true, // mantém true
        destaque: !!notificacoes.destaque,
        dataEvento: startDate ? startDate.toISOString() : null,
        ultimaAtualizacao: new Date().toISOString(),
      };

      const map = getOverrideMap();
      map[String(id)] = atualizado;
      setOverrideMap(map);

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
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>

            <div className="campo">
              <label>Descrição</label>
              <textarea
                rows="10"
                placeholder="Descreva os detalhes do evento"
                className="input-estilizado"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="campo">
              <label className="label-notificacao">Tipo de notificação</label>

              <div className="opcoes-bolinha">
                <div
                  className="item-bolinha item-bolinha--disabled"
                  role="checkbox"
                  aria-checked={true}
                  tabIndex={-1}
                  title="Este evento é de calendário e isso não pode ser alterado"
                >
                  <div className="circular-check active" />
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
                    className={`circular-check ${notificacoes.destaque ? "active" : ""}`}
                  />
                  <span>Aviso em destaque</span>
                </div>
              </div>
            </div>

            <div className="campo">
              <label>Data do evento</label>

              <div className="input-calendario-wrapper">
                <DatePicker
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
                          className={`cal-nav cal-nav--figma ${prevDisabled ? "is-disabled" : ""}`}
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

            <div className="container-btn">
              <button className="btn-publicar" onClick={handleSalvar}>
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditarEvento;
