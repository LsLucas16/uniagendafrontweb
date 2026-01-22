import React, { useState, forwardRef, useMemo } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import ptBR from "date-fns/locale/pt-BR";
import Swal from "sweetalert2";
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import "./CriarEvento.scss";

registerLocale("pt-BR", ptBR);

const TITULO_MAX = 60;
const DESCRICAO_MAX = 800;

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const CriarEvento = () => {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [startDate, setStartDate] = useState(null);

  // ✅ inicia com os dois desmarcados
  const [notificacoes, setNotificacoes] = useState({
    calendario: false,
    destaque: false,
  });

  const tituloCount = useMemo(() => titulo.length, [titulo]);
  const descricaoCount = useMemo(() => descricao.length, [descricao]);

  const handleSalvar = async () => {
    // ✅ Título obrigatório
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

    // ✅ Descrição obrigatória
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

    // ✅ Data só é obrigatória se "Aviso no calendário" estiver marcado
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
        title: "Publicando evento...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      Swal.fire({
        title: "Sucesso!",
        text: "O evento foi publicado e já está disponível.",
        icon: "success",
        confirmButtonText: "Ótimo",
        confirmButtonColor: "#2E4A67",
      });
    } catch (error) {
      Swal.fire({
        title: "Erro ao publicar",
        text: "Não foi possível salvar o evento. Tente novamente em instantes.",
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
    <div className="painel-evento">
      <div className="card-form">
        <h1 className="titulo-sessao">Criar novo evento</h1>

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

            <div className="opcoes-bolinha opcoes-bolinha--compacta">
              <div
                className="item-bolinha"
                onClick={() => {
                  setNotificacoes((prev) => {
                    const next = { ...prev, calendario: !prev.calendario };
                    if (!next.calendario) setStartDate(null);
                    return next;
                  });
                }}
                role="checkbox"
                aria-checked={notificacoes.calendario}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setNotificacoes((prev) => {
                      const next = { ...prev, calendario: !prev.calendario };
                      if (!next.calendario) setStartDate(null);
                      return next;
                    });
                  }
                }}
              >
                <div
                  className={`circular-check ${notificacoes.calendario ? "active" : ""}`}
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
                  className={`circular-check ${notificacoes.destaque ? "active" : ""}`}
                />
                <span>Aviso em destaque</span>
              </div>
            </div>
          </div>

          {/* ✅ Só mostra a data se "Aviso no calendário" estiver marcado */}
          {notificacoes.calendario && (
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
                  fixedHeight
                  // ✅ não manter "foco" do teclado grudado no mesmo dia (22) ao mudar mês
                  disabledKeyboardNavigation
                  // ✅ quando abrir, abre no mês atual (hoje) se não tem data selecionada
                  openToDate={startDate ?? new Date()}
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
          )}

          <div className="container-btn">
            <button className="btn-publicar" onClick={handleSalvar}>
              Publicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriarEvento;
