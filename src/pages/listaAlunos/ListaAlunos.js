import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Upload, X, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";
import data from "../../data/dados.json";
import "./ListaAlunos.scss";

const STORAGE_TURMA_ALUNOS = "turma_alunos_override"; // { [turmaId]: number[] alunoIds }

function safeJsonParse(v, fallback) {
  try {
    return JSON.parse(v) ?? fallback;
  } catch {
    return fallback;
  }
}

function getTurmaAlunosOverride() {
  return safeJsonParse(localStorage.getItem(STORAGE_TURMA_ALUNOS), {});
}

function setTurmaAlunosOverride(map) {
  localStorage.setItem(STORAGE_TURMA_ALUNOS, JSON.stringify(map));
}

function getLoginDoUsuario(u) {
  const v = u?.user ?? u?.login ?? u?.matricula;
  if (v === null || v === undefined || v === "") return String(u?.id ?? "");
  return String(v);
}

export default function ListaAlunos() {
  const navigate = useNavigate();
  const params = useParams();

  const turmaId = useMemo(() => {
    const fromUrl = params.turmaId ? Number(params.turmaId) : 0;
    if (fromUrl) return fromUrl;

    const fromStorage = Number(localStorage.getItem("disciplinaAtualId") || 0);
    return Number.isNaN(fromStorage) ? 0 : fromStorage;
  }, [params.turmaId]);

  const baseUsuarios = Array.isArray(data.usuarios) ? data.usuarios : [];
  const baseDisciplinas = Array.isArray(data.disciplinas)
    ? data.disciplinas
    : [];

  const disciplina = useMemo(() => {
    if (!turmaId) return null;
    return (
      baseDisciplinas.find((d) => Number(d.id) === Number(turmaId)) || null
    );
  }, [turmaId, baseDisciplinas]);

  // alunos atuais (IDs) da turma
  const [alunosIds, setAlunosIds] = useState([]);

  // busca/seleção
  const [buscaAluno, setBuscaAluno] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ✅ buffer: selecionados antes de adicionar em lote
  const [selecionadosIds, setSelecionadosIds] = useState([]); // number[]
  const searchWrapRef = useRef(null);

  useEffect(() => {
    if (!turmaId) return;

    const alunosBase = Array.isArray(disciplina?.alunoIds)
      ? disciplina.alunoIds.map(Number).filter(Boolean)
      : [];

    const map = getTurmaAlunosOverride();
    const overrideIds = Array.isArray(map[String(turmaId)])
      ? map[String(turmaId)].map(Number).filter(Boolean)
      : null;

    setAlunosIds(overrideIds ?? alunosBase);

    setBuscaAluno("");
    setDropdownOpen(false);
    setSelecionadosIds([]);
  }, [turmaId, disciplina]);

  // fecha dropdown ao clicar fora
  useEffect(() => {
    const onDown = (e) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function persistAlunos(nextIds) {
    if (!turmaId) return;
    const map = getTurmaAlunosOverride();
    map[String(turmaId)] = nextIds;
    setTurmaAlunosOverride(map);
  }

 const alunosDetalhes = useMemo(() => {
  const mapUsuarios = new Map(baseUsuarios.map((u) => [Number(u.id), u]));

  return alunosIds
    .map((id) => mapUsuarios.get(Number(id)))
    .filter(Boolean)
    .map((u) => ({
      id: u.id,
      nome: u.nome,
      matricula: u.user ?? String(u.id).padStart(9, "0"),
      tipo: u.tipo || "",
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}, [alunosIds, baseUsuarios]);

  // ✅ candidatos: não mostra quem já está na turma e nem quem já está no buffer
  const candidatosBusca = useMemo(() => {
    const q = buscaAluno.trim().toLowerCase();
    if (!q) return [];

    const instituicaoId = disciplina?.instituicaoId;

    const jaVinculados = new Set(alunosIds.map(Number));
    const jaNoBuffer = new Set(selecionadosIds.map(Number));

    return baseUsuarios
      .filter((u) => u.tipo === "aluno")
      .filter((u) =>
        instituicaoId ? Number(u.faculdadeId) === Number(instituicaoId) : true,
      )
      .filter((u) => {
        const nomeOk = (u.nome ?? "").toLowerCase().includes(q);
        const idOk = String(u.id ?? "").includes(q);
        const loginOk = getLoginDoUsuario(u).toLowerCase().includes(q);
        return nomeOk || idOk || loginOk;
      })
      .filter((u) => !jaVinculados.has(Number(u.id))) // ✅ remove já vinculados
      .filter((u) => !jaNoBuffer.has(Number(u.id))) // ✅ remove já selecionados
      .slice(0, 8)
      .map((u) => ({
        id: Number(u.id),
        nome: u.nome,
        login: getLoginDoUsuario(u),
      }));
  }, [buscaAluno, baseUsuarios, disciplina, alunosIds, selecionadosIds]);

  function adicionarAoBuffer(id) {
    const n = Number(id);
    if (Number.isNaN(n)) return;

    setSelecionadosIds((prev) => Array.from(new Set([...prev, n])));
    setBuscaAluno(""); // pronto pra buscar o próximo
    setDropdownOpen(false); // não tampa o botão
  }

  function removerDoBuffer(id) {
    setSelecionadosIds((prev) => prev.filter((x) => Number(x) !== Number(id)));
  }

  const handleAdicionarSelecionados = () => {
    if (!selecionadosIds.length) {
      Swal.fire({
        icon: "warning",
        title: "Selecione alunos",
        text: "Selecione um ou mais alunos na busca antes de adicionar.",
      });
      return;
    }

    const next = Array.from(
      new Set([...alunosIds, ...selecionadosIds].map(Number)),
    );

    setAlunosIds(next);
    persistAlunos(next); // ✅ salva em storage

    setSelecionadosIds([]);
    setBuscaAluno("");
    setDropdownOpen(false);

    Swal.fire({
      icon: "success",
      title: "Alunos adicionados",
      text: "Os alunos selecionados foram adicionados à turma.",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const handleRemoverAluno = (uid) => {
    const next = alunosIds.filter((id) => Number(id) !== Number(uid));
    setAlunosIds(next);
    persistAlunos(next);
  };

  if (!turmaId) {
    return (
      <div className="lista-alunos-page">
        <div className="lista-alunos-card">
          <button
            className="la__back"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>
          <div className="la__title">Lista de Alunos</div>
          <div className="la__empty">Nenhuma turma selecionada.</div>
        </div>
      </div>
    );
  }

  const temSelecionados = selecionadosIds.length > 0;

  return (
    <div className="lista-alunos-page">
      <div className="lista-alunos-card">
        <div className="la__top">
          <button
            className="la__back"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>

          <button
            type="button"
            className="la__import"
            onClick={() =>
              Swal.fire("Info", "Função de importação (mock).", "info")
            }
          >
            <Upload size={14} />
            Importar lista
          </button>
        </div>

        <div className="la__title">Lista de Alunos</div>

        <div className="la__sub">Adicione alunos</div>

        <div className="la__searchWrap" ref={searchWrapRef}>
          <Search size={16} className="la__searchIco" />
          <input
            value={buscaAluno}
            onChange={(e) => {
              setBuscaAluno(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => {
              if (candidatosBusca.length > 0) setDropdownOpen(true);
            }}
            placeholder="Busque por nome, matrícula..."
          />

          {dropdownOpen && candidatosBusca.length > 0 && (
            <div className="la__dropdown">
              {candidatosBusca.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="la__item"
                  onClick={() => adicionarAoBuffer(c.id)}
                >
                  <div className="la__itemName">{c.nome}</div>
                  <div className="la__itemSub">{c.login}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ✅ buffer (selecionados antes de adicionar em lote) */}
        {temSelecionados && (
          <div className="la__buffer">
            {selecionadosIds.map((id) => {
              const u = baseUsuarios.find((x) => Number(x.id) === Number(id));
              if (!u) return null;
              return (
                <div className="la__chip" key={id}>
                  <div className="la__chipName">{u.nome}</div>
                  <div className="la__chipSub">{getLoginDoUsuario(u)}</div>
                  <button
                    type="button"
                    className="la__chipX"
                    onClick={() => removerDoBuffer(id)}
                    aria-label="Remover da seleção"
                    title="Remover"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className={`la__add ${temSelecionados ? "is-active" : "is-muted"}`}
          onClick={handleAdicionarSelecionados}
          disabled={!temSelecionados}
        >
          Adicionar selecionados
        </button>

        <div className="la__list">
          {alunosDetalhes.map((a) => (
            <div className="la__row" key={a.id}>
              <div className="la__info">
                <div className="la__name">{a.nome}</div>
                <div className="la__mat">{a.matricula}</div>
              </div>

              <button
                type="button"
                className="la__x"
                onClick={() => handleRemoverAluno(a.id)}
                aria-label="Remover aluno"
                title="Remover"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {!alunosDetalhes.length && (
            <div className="la__empty">Nenhum aluno adicionado.</div>
          )}
        </div>
      </div>
    </div>
  );
}
