// EditarEvento.jsx
import React, { useEffect, useMemo, useState, forwardRef } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import ptBR from "date-fns/locale/pt-BR";
import Swal from "sweetalert2";
import { Calendar, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import { ReactComponent as ArrowLeftIcon } from "../../assets/seta.svg";
import dados from "../../data/dados.json";
import "./EditarEvento.scss";

import {
  getEventos,
  upsertEvento,
  deleteEvento,
} from "../../services/eventosStore";

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

function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem("usuario")) || null;
  } catch {
    return null;
  }
}

/**
 * TURMAS = disciplinas da instituição do usuário logado
 */
function getTurmasDisponiveis({ instituicaoId }) {
  const disciplinas = Array.isArray(dados?.disciplinas) ? dados.disciplinas : [];

  return disciplinas
    .filter((d) => Number(d?.instituicaoId) === Number(instituicaoId))
    .map((d) => ({
      id: Number(d.id),
      nome:
        typeof d?.nome === "string" && d.nome.trim()
          ? d.nome
          : `Turma ${d?.id ?? ""}`.trim(),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
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

  const usuarioLogado = useMemo(() => getUsuarioLogado(), []);

  const isCoordenador = useMemo(() => {
    const raw = usuarioLogado?.tipo ?? usuarioLogado?.cargo ?? "";
    return String(raw).toLowerCase().trim() === "coordenador";
  }, [usuarioLogado]);

  const instituicaoId = useMemo(() => {
    const inst = Number(usuarioLogado?.faculdadeId);
    return Number.isFinite(inst) && inst > 0 ? inst : null;
  }, [usuarioLogado]);

  // ✅ Turmas disponíveis (para coordenador)
  const turmasDisponiveis = useMemo(() => {
    if (!isCoordenador) return [];
    if (!instituicaoId) return [];
    return getTurmasDisponiveis({ instituicaoId });
  }, [isCoordenador, instituicaoId]);

  const turmaIdToNome = useMemo(() => {
    const m = new Map();
    turmasDisponiveis.forEach((t) => m.set(Number(t.id), t.nome));
    return m;
  }, [turmasDisponiveis]);

  // ✅ UI Turmas (igual CriarEvento)
  const [modoTurmas, setModoTurmas] = useState("all"); // "all" | "some"
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState("");
  const [turmasIds, setTurmasIds] = useState([]); // selecionadas (some)

  const setAllTurmas = () => {
    setModoTurmas("all");
    setTurmaSelecionadaId("");
    setTurmasIds([]);
  };

  const setSomeTurmas = () => {
    setModoTurmas("some");
    setTurmaSelecionadaId("");
    // não limpa turmasIds para não perder seleção
  };

  const addTurma = () => {
    if (modoTurmas !== "some") return;

    const idNum = Number(turmaSelecionadaId);
    if (!idNum || Number.isNaN(idNum)) return;

    setTurmasIds((prev) => (prev.includes(idNum) ? prev : [...prev, idNum]));
    setTurmaSelecionadaId("");
  };

  const removeTurma = (id) => {
    setTurmasIds((prev) => prev.filter((x) => x !== Number(id)));
  };

  // 🔹 Busca evento final (base + overrides) pelo id
  const getEventoAtual = () => {
    const baseEventos = Array.isArray(dados.eventos) ? dados.eventos : [];
    const todos = getEventos(baseEventos);
    return todos.find((e) => String(e.id) === String(id)) || null;
  };

  // ✅ carrega evento + inicializa turmas já selecionadas
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
      calendario: !!evento.calendario,
      destaque: !!evento.destaque,
    });

    setStartDate(parseDataEvento(evento));

    // ✅ inicializa turmas do evento (somente coordenador)
    // evento.turmasIds é o padrão criado no CriarEvento
    if (isCoordenador) {
      const idsEv = Array.isArray(evento?.turmasIds)
        ? evento.turmasIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
        : [];

      const idsAll = turmasDisponiveis.map((t) => Number(t.id)).filter(Boolean);

      // Se idsEv está vazio, assumimos "all" (ou evento antigo sem turmasIds)
      // Se idsEv cobre todas as turmas disponíveis, "all"
      // Caso contrário, "some" com os ids atuais
      const allSet = new Set(idsAll);
      const evSet = new Set(idsEv.filter((x) => allSet.has(Number(x))));
      const cobreTudo = idsAll.length > 0 && idsAll.every((x) => evSet.has(x));

      if (!idsEv.length || cobreTudo) {
        setModoTurmas("all");
        setTurmasIds([]); // quando all, chips ficam ocultos (igual CriarEvento)
      } else {
        setModoTurmas("some");
        setTurmasIds(Array.from(evSet));
      }

      setTurmaSelecionadaId("");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, usuarioLogado, isCoordenador, turmasDisponiveis]);

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

    // ✅ se coordenador estiver em "Selecionar", exige 1+ turma
    if (isCoordenador && modoTurmas === "some" && turmasIds.length === 0) {
      Swal.fire({
        title: "Selecione ao menos uma turma",
        text: "Você está em 'Selecionar'. Adicione pelo menos uma turma ou troque para 'Todas'.",
        icon: "warning",
        confirmButtonText: "Ok",
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

      // ✅ regra final turmasIds (somente coordenador)
      const turmasIdsFinal = isCoordenador
        ? Array.from(
            new Set(
              (modoTurmas === "all"
                ? turmasDisponiveis.map((t) => Number(t.id))
                : turmasIds
              ).filter((x) => Number.isFinite(x) && x > 0),
            ),
          )
        : undefined;

      const atualizado = {
        ...original,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        calendario: !!notificacoes.calendario,
        destaque: !!notificacoes.destaque,
        ...(dataEventoISO ? { dataEvento: dataEventoISO } : {}),
        ...(dataEventoISO ? {} : { dataEvento: undefined }),
        ultimaAtualizacao: agoraISO,

        // ✅ salva as turmas (coordenador)
        ...(isCoordenador ? { turmasIds: turmasIdsFinal } : {}),
      };

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

  const InputDataComIcone = forwardRef(({ value, onClick, placeholder }, ref) => {
    return (
      <button type="button" className="date-input" onClick={onClick} ref={ref}>
        <span className="date-input__icon" aria-hidden="true">
          <Calendar size={16} />
        </span>

        <span className={value ? "date-input__value" : "date-input__placeholder"}>
          {value || placeholder}
        </span>
      </button>
    );
  });

  return (
    <div className="painel-evento editar-evento">
      <div className="editar-wrapper">
        <div className="editar-topbar">
          <button type="button" className="btn-voltar" onClick={() => navigate(-1)}>
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

            {/* ✅ TURMAS (SOMENTE COORDENADOR) */}
            {isCoordenador && (
              <section className="card-bloco" style={{ padding: 0, boxShadow: "none" }}>
                <h2 className="titulo-bloco" style={{ marginTop: 8 }}>
                  Turmas
                </h2>

                <div className="turmas-toggle">
                  <button
                    type="button"
                    className={`turmas-toggle__btn ${
                      modoTurmas === "all" ? "is-active" : ""
                    }`}
                    onClick={setAllTurmas}
                  >
                    Todas
                  </button>

                  <button
                    type="button"
                    className={`turmas-toggle__btn ${
                      modoTurmas === "some" ? "is-active" : ""
                    }`}
                    onClick={setSomeTurmas}
                  >
                    Selecionar
                  </button>
                </div>

                <div className="campo" style={{ marginBottom: 0 }}>
                  <div className="turmas-select-row">
                    <div className="select-wrap">
                      <select
                        className="select-estilizado"
                        value={turmaSelecionadaId}
                        onChange={(e) => setTurmaSelecionadaId(e.target.value)}
                        disabled={modoTurmas === "all"}
                      >
                        <option value="" disabled>
                          Selecionar turma
                        </option>

                        {turmasDisponiveis
                          .filter((t) => !turmasIds.includes(Number(t.id)))
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nome}
                            </option>
                          ))}
                      </select>

                      <span className="select-arrow" aria-hidden="true">
                        ▾
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-add-turma"
                      onClick={addTurma}
                      disabled={modoTurmas === "all" || !turmaSelecionadaId}
                    >
                      Adicionar
                    </button>
                  </div>

                  {modoTurmas === "some" && turmasIds.length > 0 && (
                    <div className="turmas-chips">
                      {turmasIds.map((tid) => (
                        <div className="chip-turma" key={tid}>
                          <span className="chip-text">
                            {turmaIdToNome.get(tid) || `Turma ${tid}`}
                          </span>
                          <button
                            type="button"
                            className="chip-remove"
                            onClick={() => removeTurma(tid)}
                            aria-label="Remover turma"
                            title="Remover"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {modoTurmas === "all" && (
                    <div className="turmas-info">
                      Todas as turmas desta instituição serão notificadas.
                    </div>
                  )}
                </div>
              </section>
            )}

            <div className="campo" style={{ marginTop: 18 }}>
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
                    customInput={<InputDataComIcone placeholder="Escolha uma data" />}
                    calendarClassName="calendario-customizado"
                    popperClassName="popper-calendario"
                    showPopperArrow={false}
                    renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => {
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
                      const prevDisabled = firstOfShownMonth <= firstOfCurrentMonth;

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

              <button type="button" className="btn-excluir" onClick={handleExcluir}>
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
