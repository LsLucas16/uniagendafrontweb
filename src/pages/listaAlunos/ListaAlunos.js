import React, { useMemo, useState, useEffect } from "react";
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
  // futuro: matrícula = login/user
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
  const baseDisciplinas = Array.isArray(data.disciplinas) ? data.disciplinas : [];

  const disciplina = useMemo(() => {
    if (!turmaId) return null;
    return baseDisciplinas.find((d) => Number(d.id) === Number(turmaId)) || null;
  }, [turmaId, baseDisciplinas]);

  // alunos atuais (IDs)
  const [alunosIds, setAlunosIds] = useState([]);
  const [buscaAluno, setBuscaAluno] = useState("");
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState(null);

  useEffect(() => {
    if (!turmaId) return;

    // alunos base da turma (dados.json)
    const alunosBase = baseUsuarios
      .filter((u) => u.tipo === "aluno" && Array.isArray(u.disciplinas))
      .filter((u) => u.disciplinas.map(Number).includes(Number(turmaId)))
      .map((u) => Number(u.id));

    // override
    const map = getTurmaAlunosOverride();
    const overrideIds = Array.isArray(map[String(turmaId)]) ? map[String(turmaId)].map(Number) : null;

    setAlunosIds(overrideIds ?? alunosBase);
  }, [turmaId, baseUsuarios]);

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
        login: getLoginDoUsuario(u), // 👈 aqui troca o "id formatado" pelo user/login
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [alunosIds, baseUsuarios]);

  const candidatosBusca = useMemo(() => {
    const q = buscaAluno.trim().toLowerCase();
    if (!q) return [];

    const instituicaoId = disciplina?.instituicaoId;

    return baseUsuarios
      .filter((u) => u.tipo === "aluno")
      .filter((u) => (instituicaoId ? Number(u.faculdadeId) === Number(instituicaoId) : true))
      .filter((u) => {
        const nomeOk = (u.nome ?? "").toLowerCase().includes(q);
        const idOk = String(u.id ?? "").includes(q);
        const loginOk = getLoginDoUsuario(u).toLowerCase().includes(q); // 👈 busca por login também
        return nomeOk || idOk || loginOk;
      })
      .slice(0, 8)
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        login: getLoginDoUsuario(u),
      }));
  }, [buscaAluno, baseUsuarios, disciplina]);

  const handleAdicionarAluno = () => {
    if (!alunoSelecionadoId) {
      Swal.fire({
        icon: "warning",
        title: "Selecione um aluno",
        text: "Busque e selecione um aluno antes de adicionar.",
      });
      return;
    }

    const next = Array.from(new Set([...alunosIds, Number(alunoSelecionadoId)]));
    setAlunosIds(next);
    persistAlunos(next);

    setBuscaAluno("");
    setAlunoSelecionadoId(null);
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
          <button className="la__back" onClick={() => navigate(-1)} type="button">
            <ArrowLeft size={14} />
            Voltar
          </button>
          <div className="la__title">Lista de Alunos</div>
          <div className="la__empty">Nenhuma turma selecionada.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="lista-alunos-page">
      <div className="lista-alunos-card">
        <div className="la__top">
          <button className="la__back" onClick={() => navigate(-1)} type="button">
            <ArrowLeft size={14} />
            Voltar
          </button>

          <button
            type="button"
            className="la__import"
            onClick={() => Swal.fire("Info", "Função de importação (mock).", "info")}
          >
            <Upload size={14} />
            Importar lista
          </button>
        </div>

        <div className="la__title">Lista de Alunos</div>

        <div className="la__sub">Adicione alunos</div>

        <div className="la__searchWrap">
          <Search size={16} className="la__searchIco" />
          <input
            value={buscaAluno}
            onChange={(e) => {
              setBuscaAluno(e.target.value);
              setAlunoSelecionadoId(null);
            }}
            placeholder="Busque por nome, matrícula..."
          />

          {candidatosBusca.length > 0 && (
            <div className="la__dropdown">
              {candidatosBusca.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`la__item ${Number(alunoSelecionadoId) === Number(c.id) ? "is-active" : ""}`}
                  onClick={() => setAlunoSelecionadoId(c.id)}
                >
                  <div className="la__itemName">{c.nome}</div>
                  <div className="la__itemSub">{c.login}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="la__add" onClick={handleAdicionarAluno}>
          Adicionar aluno
        </button>

        <div className="la__list">
          {alunosDetalhes.map((a) => (
            <div className="la__row" key={a.id}>
              <div className="la__info">
                <div className="la__name">{a.nome}</div>
                <div className="la__mat">{a.login}</div>
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

          {!alunosDetalhes.length && <div className="la__empty">Nenhum aluno adicionado.</div>}
        </div>
      </div>
    </div>
  );
}
