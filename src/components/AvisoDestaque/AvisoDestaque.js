import React, { useEffect, useState } from "react";
import { Bell, CalendarDays, Check, BellRing } from "lucide-react";
import dados from "../../data/dados.json";
import { getEventos } from "../../services/eventosStore";
import "./AvisoDestaque.scss";

function normalizarLista(valor) {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor.map(Number).filter(Boolean);
  return [Number(valor)].filter(Boolean);
}

function formatarData(dataIso) {
  if (!dataIso) return "";
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR");
}

function obterIdsDisciplinasDoUsuario(usuario, baseDisciplinas) {
  if (!usuario) return [];

  const usuarioId = Number(usuario.id);
  const instituicaoId = Number(
    usuario.instituicaoId ?? usuario.faculdadeId ?? 0,
  );

  const baseIds = (baseDisciplinas || [])
    .filter((disc) => Number(disc.instituicaoId) === instituicaoId)
    .filter((disc) => {
      const alunosIds = normalizarLista(
        disc.alunosIds || disc.alunoIds || disc.alunoId,
      );
      return alunosIds.includes(usuarioId);
    })
    .map((disc) => Number(disc.id));

  let overrideIds = [];

  try {
    const vinculosOverride = JSON.parse(
      localStorage.getItem("usuarios_disciplinas_override") || "{}",
    );

    const direto = vinculosOverride?.[usuarioId];

    if (Array.isArray(direto)) {
      overrideIds = direto.map(Number).filter(Boolean);
    } else if (Array.isArray(direto?.disciplinasIds)) {
      overrideIds = direto.disciplinasIds.map(Number).filter(Boolean);
    }
  } catch {
    overrideIds = [];
  }

  return [...new Set([...baseIds, ...overrideIds])];
}

export default function AvisoDestaque({ usuario, disciplinasBase = [] }) {
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [avisosVisiveis, setAvisosVisiveis] = useState([]);

  const storageKeyVistos = usuario?.id
    ? `avisos_destaque_vistos_${usuario.id}`
    : null;

  useEffect(() => {
    function carregarAvisos() {
      const tipoUsuario = String(usuario?.tipo || "").toLowerCase();
      const podeReceberAviso =
        tipoUsuario === "aluno" || tipoUsuario === "responsavel";

      if (!usuario || !podeReceberAviso) {
        setAvisosVisiveis([]);
        return;
      }

      const todosEventos = getEventos(dados.eventos || []);
      const disciplinasUsuario = obterIdsDisciplinasDoUsuario(
        usuario,
        disciplinasBase,
      );

      let vistos = [];

      try {
        vistos = JSON.parse(localStorage.getItem(storageKeyVistos) || "[]");
      } catch {
        vistos = [];
      }

      const vistosSet = new Set(vistos.map(Number));

      const filtrados = todosEventos
        .filter((ev) => ev?.destaque === true)
        .filter((ev) => {
          const instituicaoUsuario = Number(
            usuario?.instituicaoId ?? usuario?.faculdadeId ?? 0,
          );
          return Number(ev?.instituicaoId) === instituicaoUsuario;
        })
        .filter((ev) => {
          const idsEvento = normalizarLista(
            ev?.disciplinaIds || ev?.disciplinaId,
          );

          if (ev?.destino === "todas") return true;
          if (!idsEvento.length) return false;

          return idsEvento.some((id) =>
            disciplinasUsuario.includes(Number(id)),
          );
        })
        .filter((ev) => !vistosSet.has(Number(ev.id)))
        .sort((a, b) => {
          const dataA = new Date(a?.ultimaAtualizacao || 0).getTime();
          const dataB = new Date(b?.ultimaAtualizacao || 0).getTime();
          return dataB - dataA;
        });

      setAvisosVisiveis(filtrados);
      setIndiceAtual(0);
    }

    carregarAvisos();

    const recarregar = () => carregarAvisos();
    window.addEventListener("storage", recarregar);
    window.addEventListener("app:data-changed", recarregar);

    return () => {
      window.removeEventListener("storage", recarregar);
      window.removeEventListener("app:data-changed", recarregar);
    };
  }, [usuario, disciplinasBase, storageKeyVistos]);

  const aviso = avisosVisiveis[indiceAtual];

  function atualizarLista(removerId, tipo = "visto") {
    const id = Number(removerId);

    if (tipo === "visto" && storageKeyVistos) {
      const atuais = JSON.parse(localStorage.getItem(storageKeyVistos) || "[]");
      localStorage.setItem(
        storageKeyVistos,
        JSON.stringify([...new Set([...atuais.map(Number), id])]),
      );

      window.dispatchEvent(new Event("app:data-changed"));
    }

    const novaLista = avisosVisiveis.filter((item) => Number(item.id) !== id);
    setAvisosVisiveis(novaLista);
    setIndiceAtual((atual) => {
      if (!novaLista.length) return 0;
      return Math.min(atual, novaLista.length - 1);
    });
  }

  if (!aviso) return null;

  const autor =
    (dados.usuarios || []).find(
      (u) => Number(u.id) === Number(aviso.criadoPorId),
    )?.nome || "Autor não informado";

  const disciplinaPrincipal = (disciplinasBase || []).find((disc) =>
    normalizarLista(aviso.disciplinaIds || aviso.disciplinaId).includes(
      Number(disc.id),
    ),
  );

  const corFaixa =
    disciplinaPrincipal?.coresPorUsuario?.[String(usuario?.id)] ||
    disciplinaPrincipal?.cor ||
    "#E7C86F";

  return (
    <div className="aviso-destaque-overlay">
      <div
        className="aviso-destaque-card"
        role="dialog"
        aria-modal="true"
        style={{ "--aviso-faixa-cor": corFaixa }}
      >
        <div className="aviso-destaque-faixa" />

        <div className="aviso-destaque-content">
          <div className="aviso-destaque-header">
            <Bell size={22} strokeWidth={2.4} />
            <h2>Aviso em destaque</h2>
          </div>

          <h3 className="aviso-destaque-titulo">{aviso.titulo}</h3>

          {disciplinaPrincipal?.nome ? (
            <div
              className="aviso-destaque-chip"
              style={{ "--aviso-chip-cor": corFaixa }}
            >
              {disciplinaPrincipal.nome}
            </div>
          ) : null}

          <div className="aviso-destaque-meta">
            <span className="aviso-destaque-autor">
              <strong>Criado por:</strong> {autor}
            </span>

            {aviso.dataEvento ? (
              <span className="aviso-destaque-data">
                <CalendarDays size={15} />
                {formatarData(aviso.dataEvento)}
              </span>
            ) : null}
          </div>

          <p className="aviso-destaque-descricao">{aviso.descricao}</p>

          <div className="aviso-destaque-actions">
            <button
              type="button"
              className="btn-aviso btn-aviso-outline"
              onClick={() => atualizarLista(aviso.id, "visto")}
            >
              <Check size={18} />
              Marcar como visto
            </button>

            <button
              type="button"
              className="btn-aviso btn-aviso-outline"
              onClick={() => atualizarLista(aviso.id, "adiado")}
            >
              <BellRing size={18} />
              Me lembre depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
