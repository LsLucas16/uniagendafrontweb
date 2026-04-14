// EditarEvento.jsx
import React, { useEffect, useMemo, useState, forwardRef } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import ptBR from "date-fns/locale/pt-BR";
import Swal from "sweetalert2";
import { Calendar, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import dados from "../../data/dados.json";
import "./EditarEvento.scss";
import { ReactComponent as ArrowLeftIcon } from "../../assets/seta.svg";

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

  // ✅ CORREÇÃO PRINCIPAL (YYYY-MM-DD como LOCAL)
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-").map(Number);
    return new Date(yyyy, mm - 1, dd);
  }

  // fallback normal
  const isoTry = new Date(raw);
  if (!Number.isNaN(isoTry.getTime())) return isoTry;

  // formato BR
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

function getTurmasDisponiveis({ instituicaoId }) {
  const disciplinas = Array.isArray(dados?.disciplinas)
    ? dados.disciplinas
    : [];

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

  const [notificacoes, setNotificacoes] = useState({
    calendario: true,
    destaque: false,
  });

  const [modoTurmas, setModoTurmas] = useState("all");
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState("");
  const [turmasIds, setTurmasIds] = useState([]);

  const tituloCount = useMemo(() => titulo.length, [titulo]);
  const descricaoCount = useMemo(() => descricao.length, [descricao]);

  const usuario = useMemo(() => getUsuarioLogado(), []);
  const isCoordenador = (usuario?.tipo || "").toLowerCase() === "coordenador";

  const instituicaoId = useMemo(
    () => Number(usuario?.faculdadeId) || null,
    [usuario],
  );

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

  const setAllTurmas = () => {
    const idsAll = turmasDisponiveis
      .map((t) => Number(t.id))
      .filter((n) => Number.isFinite(n) && n > 0);

    setModoTurmas("all");
    setTurmaSelecionadaId("");
    setTurmasIds(idsAll);
  };

  const setSomeTurmas = () => {
    setModoTurmas("some");
    setTurmaSelecionadaId("");
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

    if (
      usuario?.faculdadeId &&
      Number(evento.instituicaoId) !== Number(usuario.faculdadeId)
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
    setStartDate(parseDataEvento(evento));

    setNotificacoes({
      calendario: !!evento.calendario,
      destaque: !!evento.destaque,
    });

    if (isCoordenador) {
      const idsEvento = Array.from(
        new Set(
          (
            evento.turmasIds ||
            evento.disciplinaIds ||
            (evento.disciplinaId ? [evento.disciplinaId] : [])
          )
            .map(Number)
            .filter((n) => Number.isFinite(n) && n > 0),
        ),
      );

      const idsAll = turmasDisponiveis
        .map((t) => Number(t.id))
        .filter((n) => Number.isFinite(n) && n > 0);

      const cobreTudo =
        idsAll.length > 0 &&
        idsAll.every((idTurma) => idsEvento.includes(idTurma));

      if (!idsEvento.length || cobreTudo) {
        setModoTurmas("all");
        setTurmasIds(idsAll);
      } else {
        setModoTurmas("some");
        setTurmasIds(idsEvento);
      }

      setTurmaSelecionadaId("");
    }
  }, [id, navigate, usuario, isCoordenador, turmasDisponiveis]);

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
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      const original = getEventoAtual();
      if (!original) throw new Error("Evento não encontrado");

      const dataEventoISO =
        notificacoes.calendario && startDate
          ? `${startDate.getFullYear()}-${String(
              startDate.getMonth() + 1,
            ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`
          : null;

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
        dataEvento: dataEventoISO,
        ultimaAtualizacao: new Date().toISOString(),
        ...(isCoordenador
          ? { turmasIds: turmasIdsFinal, disciplinaIds: turmasIdsFinal }
          : {}),
      };

      Object.keys(atualizado).forEach((k) => {
        if (atualizado[k] === undefined) delete atualizado[k];
      });

      upsertEvento(atualizado);

      Swal.close();

      await Swal.fire({
        title: "Sucesso!",
        text: "As alterações foram salvas.",
        icon: "success",
        confirmButtonText: "Ótimo",
        confirmButtonColor: "#2E4A67",
      });

      navigate("/eventos");
    } catch (error) {
      Swal.close();
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
        await Swal.fire({
          title: "Evento não encontrado",
          text: "Esse evento já não está disponível.",
          icon: "info",
          confirmButtonColor: "#2E4A67",
        });
        navigate("/eventos");
        return;
      }

      // Salva o usuário ANTES de qualquer operação no store
      const usuarioAntes = localStorage.getItem("usuario");

      deleteEvento(original.id);

      // Restaura o usuário caso o store tenha tocado no localStorage
      if (usuarioAntes && !localStorage.getItem("usuario")) {
        localStorage.setItem("usuario", usuarioAntes);
      }

      await Swal.fire({
        title: "Excluído",
        text: "O evento foi excluído com sucesso.",
        icon: "success",
        confirmButtonText: "Ok",
        confirmButtonColor: "#2E4A67",
      });

      navigate("/eventos");
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
    <div
      className={`painel-evento ${isCoordenador ? "criar-evento-coordenador-page" : ""}`}
    >
      <div
        className={`eventos-wrap ${isCoordenador ? "eventos-wrap--coordenador" : ""}`}
      >
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

        <section
          className={`card-bloco ${
            isCoordenador ? "criar-evento-card criar-evento-card--top" : ""
          }`}
        >
          <h1 className={isCoordenador ? "page-title" : "titulo-sessao"}>
            Editar evento
          </h1>

          <div
            className={
              isCoordenador
                ? "formulario formulario--coordenador"
                : "formulario"
            }
          >
            <div className={isCoordenador ? "field" : "campo"}>
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

            <div className={isCoordenador ? "field" : "campo"}>
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
          </div>
        </section>

        {isCoordenador && (
          <section className="card-bloco criar-evento-card">
            <h2 className="section-title">Turmas</h2>

            <div className="turmas-toggle">
              <button
                type="button"
                className={`turmas-toggle__btn ${modoTurmas === "all" ? "is-active" : ""}`}
                onClick={setAllTurmas}
              >
                Todas
              </button>

              <button
                type="button"
                className={`turmas-toggle__btn ${modoTurmas === "some" ? "is-active" : ""}`}
                onClick={setSomeTurmas}
              >
                Selecionar
              </button>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <div className="turmas-select-row">
                <div className="select-wrap">
                  <select
                    className="select-estilizado"
                    value={turmaSelecionadaId}
                    onChange={(e) => setTurmaSelecionadaId(e.target.value)}
                    disabled={modoTurmas === "all"}
                  >
                    <option value="">Selecionar turma</option>

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

              {turmasIds.length > 0 && (
                <div className="turmas-chips">
                  {turmasIds.map((tid) => (
                    <div className="chip-turma" key={tid}>
                      <span className="chip-text">
                        {turmaIdToNome.get(tid) || `Turma ${tid}`}
                      </span>

                      {modoTurmas === "some" && (
                        <button
                          type="button"
                          className="chip-remove"
                          onClick={() => removeTurma(tid)}
                          aria-label="Remover turma"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {modoTurmas === "all" && (
                <div className="turmas-info">
                  Todas as turmas serão selecionadas.
                </div>
              )}
            </div>
          </section>
        )}

        <section
          className={`card-bloco ${isCoordenador ? "criar-evento-card" : ""}`}
        >
          {isCoordenador ? (
            <h2 className="section-title">Tipo de notificação</h2>
          ) : (
            <div className="campo">
              <label className="label-notificacao">Tipo de notificação</label>
            </div>
          )}

          <div className={isCoordenador ? "field" : "campo"}>
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
            <div className={isCoordenador ? "field" : "campo"}>
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
          <div className="container-btn-acoes">
            <button
              type="button"
              className="btn-publicar-editar"
              onClick={handleSalvar}
            >
              Salvar alterações
            </button>

            <button
              type="button"
              className="btn-excluir-editar"
              onClick={handleExcluir}
            >
              Excluir evento
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EditarEvento;
