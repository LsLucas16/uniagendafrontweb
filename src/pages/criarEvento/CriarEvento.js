import React, { useState, forwardRef, useMemo } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import ptBR from "date-fns/locale/pt-BR";
import Swal from "sweetalert2";
import { Calendar, X } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import "./CriarEvento.scss";

import dados from "../../data/dados.json";
import { nextEventoId, upsertEvento } from "../../services/eventosStore";

registerLocale("pt-BR", ptBR);

const TITULO_MAX = 60;
const DESCRICAO_MAX = 800;

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem("usuario")) || null;
  } catch {
    return null;
  }
}

function getDisciplinaAtualId() {
  return localStorage.getItem("disciplinaAtualId") || "";
}

/**
 * TURMAS = disciplinas da instituição do usuário logado
 * (No seu JSON não existe "turmas", então usamos dados.disciplinas)
 */
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

const CriarEvento = () => {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [startDate, setStartDate] = useState(null);

  const [notificacoes, setNotificacoes] = useState({
    calendario: false,
    destaque: false,
  });

  // ✅ Turmas (coordenador)
  const [modoTurmas, setModoTurmas] = useState("all"); // "all" | "some"
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState("");
  const [turmaIds, setTurmaIds] = useState([]);

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

  // ✅ Toggle
  const setAllTurmas = () => {
    setModoTurmas("all");
    setTurmaSelecionadaId("");
    setTurmaIds([]);
  };

  const setSomeTurmas = () => {
    setModoTurmas("some");
    setTurmaSelecionadaId("");
    // não limpa turmaIds aqui pra não perder seleção sem querer
  };

  const addTurma = () => {
    if (modoTurmas !== "some") return;

    const idNum = Number(turmaSelecionadaId);
    if (!idNum || Number.isNaN(idNum)) return;

    setTurmaIds((prev) => (prev.includes(idNum) ? prev : [...prev, idNum]));
    setTurmaSelecionadaId("");
  };

  const removeTurma = (id) => {
    setTurmaIds((prev) => prev.filter((x) => x !== id));
  };

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

    // ✅ Se estiver em "Selecionar", obriga escolher ao menos 1 turma
    if (isCoordenador && modoTurmas === "some" && turmaIds.length === 0) {
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
        title: "Publicando evento...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      // ✅ id novo (mantém seu padrão atual)
      const id = nextEventoId(dados.eventos);

      const dataEventoISO = notificacoes.calendario
        ? new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
          ).toISOString()
        : null;

      const agoraISO = new Date().toISOString();

      const usuarioNow = getUsuarioLogado();
      const criadoPorId = usuarioNow?.id;

      if (!criadoPorId) {
        Swal.close();
        await Swal.fire({
          title: "Sessão expirada",
          text: "Faça login novamente para publicar o evento.",
          icon: "warning",
          confirmButtonText: "Ok",
          confirmButtonColor: "#2E4A67",
        });
        return;
      }

      const disciplinaAtual = Number(getDisciplinaAtualId()) || null;
      if (!disciplinaAtual) {
        Swal.close();
        await Swal.fire({
          title: "Selecione uma disciplina",
          text: "Escolha uma disciplina antes de criar o evento.",
          icon: "warning",
          confirmButtonText: "Ok",
          confirmButtonColor: "#2E4A67",
        });
        return;
      }

      const instId = Number(usuarioNow?.faculdadeId) || null;
      if (!instId) {
        Swal.close();
        await Swal.fire({
          title: "Usuário sem instituição",
          text: "Não foi possível identificar a instituição do usuário logado.",
          icon: "warning",
          confirmButtonText: "Ok",
          confirmButtonColor: "#2E4A67",
        });
        return;
      }

      // ✅ regra final: sempre salvar turmasIds pro coordenador
      const turmasIdsFinal = isCoordenador
        ? Array.from(
            new Set(
              (modoTurmas === "all"
                ? turmasDisponiveis.map((t) => Number(t.id))
                : turmaIds
              ).filter((x) => Number.isFinite(x) && x > 0),
            ),
          )
        : undefined;

      const novoEvento = {
        id,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        ultimaAtualizacao: agoraISO,
        dataEvento: dataEventoISO ?? null, // ✅ padroniza sempre
        criadoPorId,
        instituicaoId: instId,
        disciplinaId: disciplinaAtual,
        calendario: notificacoes.calendario,
        destaque: notificacoes.destaque,

        // ✅ NOVO: turmasIds (disciplinas = turmas)
        ...(isCoordenador ? { turmasIds: turmasIdsFinal } : {}),
      };

      upsertEvento(novoEvento);

      Swal.close();

      await Swal.fire({
        title: "Sucesso!",
        text: "O evento foi publicado e já está disponível.",
        icon: "success",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      setTitulo("");
      setDescricao("");
      setStartDate(null);
      setNotificacoes({ calendario: false, destaque: false });

      // reset turmas
      setAllTurmas();
    } catch (error) {
      Swal.close();
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
      <div className="eventos-wrap">
        <section className="card-bloco">
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
          </div>
        </section>

        {/* CARD 2: Turmas */}
        {isCoordenador && (
          <section className="card-bloco">
            <h2 className="titulo-bloco">Turmas</h2>

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
                      .filter((t) => !turmaIds.includes(Number(t.id)))
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

              {modoTurmas === "some" && turmaIds.length > 0 && (
                <div className="turmas-chips">
                  {turmaIds.map((id) => (
                    <div className="chip-turma" key={id}>
                      <span className="chip-text">
                        {turmaIdToNome.get(id) || `Turma ${id}`}
                      </span>
                      <button
                        type="button"
                        className="chip-remove"
                        onClick={() => removeTurma(id)}
                        aria-label="Remover turma"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {modoTurmas === "all" && (
                <div className="turmas-info">
                  Todas as turmas aos cuidados desse coordenador serão
                  notificadas.
                </div>
              )}
            </div>
          </section>
        )}

        {/* CARD 3 */}
        <section className="card-bloco">
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
            <div className="campo">
              <label>Data do evento</label>

              <div className="input-calendario-wrapper">
                {/* <DatePicker
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
                  disabledKeyboardNavigation
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
                      1
                    );
                    const firstOfShownMonth = new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      1
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
                />*/}
                <input
                  type="date"
                  className="input-estilizado"
                  value={startDate || ""}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="container-btn">
            <button className="btn-publicar" onClick={handleSalvar}>
              Publicar
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CriarEvento;
