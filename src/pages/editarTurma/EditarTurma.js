import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Upload, Search, X } from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

import EditarResponsavelModal from "../../components/EditarResponsavelModal/EditarResponsavelModal";
import data from "../../data/dados.json";
import "./EditarTurma.scss";

const STORAGE_TURMAS = "turmas_override";
const STORAGE_TURMA_ALUNOS = "turma_alunos_override";

const defaultPerms = {
  eventos: true,
  responsaveis: false,
  alunos: true,
};

function safeJsonParse(v, fallback) {
  try {
    return JSON.parse(v) ?? fallback;
  } catch {
    return fallback;
  }
}

function getTurmasOverride() {
  const raw = safeJsonParse(localStorage.getItem(STORAGE_TURMAS), []);

  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return Object.values(raw);

  return [];
}

function setTurmasOverride(items) {
  localStorage.setItem(STORAGE_TURMAS, JSON.stringify(items));
  window.dispatchEvent(new Event("turmas:changed"));
  window.dispatchEvent(new Event("app:data-changed"));
}

function getTurmaOverrideById(turmaId) {
  const lista = getTurmasOverride();
  return lista.find((item) => Number(item?.id) === Number(turmaId)) || null;
}

function upsertTurmaOverride(turmaId, partial) {
  const lista = getTurmasOverride();
  const index = lista.findIndex((item) => Number(item?.id) === Number(turmaId));

  if (index >= 0) {
    lista[index] = { ...lista[index], ...partial, id: Number(turmaId) };
  } else {
    lista.push({ id: Number(turmaId), ...partial });
  }

  setTurmasOverride(lista);
}

function getTurmaAlunosOverride() {
  return safeJsonParse(localStorage.getItem(STORAGE_TURMA_ALUNOS), {});
}

function setTurmaAlunosOverride(map) {
  localStorage.setItem(STORAGE_TURMA_ALUNOS, JSON.stringify(map));
}

function splitNomeComplemento(disciplinaNome = "") {
  const parts = String(disciplinaNome).split(" - ");
  if (parts.length >= 2) {
    return { nome: parts[0], complemento: parts.slice(1).join(" - ") };
  }
  return { nome: disciplinaNome, complemento: "" };
}

function buildNomeCompleto(nome = "", complemento = "") {
  const n = String(nome || "").trim();
  const c = String(complemento || "").trim();

  if (!n && !c) return "";
  if (!c) return n;

  return `${n} - ${c}`;
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

function normalizarIds(ids, idAntigo) {
  if (Array.isArray(ids)) {
    return ids.map(Number).filter(Boolean);
  }

  if (idAntigo !== undefined && idAntigo !== null && idAntigo !== "") {
    return [Number(idAntigo)].filter(Boolean);
  }

  return [];
}

function normalizeMatricula(value) {
  return String(value || "").trim();
}

function getUsuarioMatricula(u) {
  return normalizeMatricula(u?.user);
}

export default function EditarTurma() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("edit");
  const [editIndex, setEditIndex] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const searchWrapRef = useRef(null);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();
  const { turmaId: routeTurmaId } = useParams();

  const [usuarioLogado, setUsuarioLogado] = useState(() => getUsuarioLogado());
  const [disciplinaAtualId, setDisciplinaAtualId] = useState(
    () => routeTurmaId || getDisciplinaAtualId(),
  );

  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [complemento, setComplemento] = useState("");
  const [tipoTurma, setTipoTurma] = useState("primaria");
  const [responsaveis, setResponsaveis] = useState([]);
  const [buscaAluno, setBuscaAluno] = useState("");
  const [alunosIds, setAlunosIds] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState(null);

  const temAlunoSelecionado = Boolean(alunoSelecionadoId);

  const openEditarResponsavel = (index) => {
    setModalMode("edit");
    setEditIndex(index);
    setModalOpen(true);
  };

  const openAdicionarResponsavel = () => {
    setModalMode("add");
    setEditIndex(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditIndex(null);
  };

  useEffect(() => {
    const onDisciplinaChanged = () => {
      setDisciplinaAtualId(getDisciplinaAtualId());
    };

    const onStorage = (e) => {
      if (e.key === "usuario") {
        setUsuarioLogado(getUsuarioLogado());
      }

      if (e.key === "disciplinaAtualId") {
        setDisciplinaAtualId(getDisciplinaAtualId());
      }
    };

    window.addEventListener("disciplinaAtual:changed", onDisciplinaChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("disciplinaAtual:changed", onDisciplinaChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!routeTurmaId) return;

    const routeId = String(routeTurmaId);
    setDisciplinaAtualId(routeId);
    localStorage.setItem("disciplinaAtualId", routeId);
    window.dispatchEvent(new Event("disciplinaAtual:changed"));
  }, [routeTurmaId]);

  useEffect(() => {
    const onDown = (e) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const turmaId = useMemo(() => {
    const n = disciplinaAtualId ? Number(disciplinaAtualId) : 0;
    return Number.isNaN(n) ? 0 : n;
  }, [disciplinaAtualId]);

  const baseDisciplinas = Array.isArray(data.disciplinas || data.diciplinas)
    ? data.disciplinas || data.diciplinas
    : [];

  const baseUsuarios = Array.isArray(data.usuarios) ? data.usuarios : [];

  const usuariosComUser = useMemo(() => {
    return baseUsuarios.map((u) => ({
      ...u,
      user: u.user ?? String(u.id).padStart(9, "0"),
    }));
  }, [baseUsuarios]);

  const user = useMemo(() => {
    const id = usuarioLogado?.id;
    if (!id) return null;
    return baseUsuarios.find((u) => Number(u.id) === Number(id)) || null;
  }, [usuarioLogado, baseUsuarios]);

  const isCoordenador = user?.tipo === "coordenador";

  const disciplinaBase = useMemo(() => {
    if (!turmaId) return null;

    const override = getTurmaOverrideById(turmaId);
    if (override) return override;

    return (
      baseDisciplinas.find((d) => Number(d.id) === Number(turmaId)) || null
    );
  }, [baseDisciplinas, turmaId]);

  useEffect(() => {
    setLoading(true);

    if (!disciplinaBase) {
      setLoading(false);
      return;
    }

    const turmaOverride = getTurmaOverrideById(turmaId);

    if (
      turmaOverride &&
      !turmaOverride.nome &&
      (turmaOverride.nomeCustom || turmaOverride.complementoCustom)
    ) {
      const nomeCompleto = buildNomeCompleto(
        turmaOverride.nomeCustom,
        turmaOverride.complementoCustom,
      );

      upsertTurmaOverride(turmaId, {
        ...turmaOverride,
        nome: nomeCompleto,
      });
    }

    const disciplinaMerged = {
      ...disciplinaBase,
      ...(turmaOverride || {}),
    };

    const { nome: n, complemento: c } = splitNomeComplemento(
      disciplinaMerged.nome || "",
    );

    setNome(n);
    setComplemento(c);
    setTipoTurma(disciplinaMerged.tipo || "primaria");

    const professorIds = normalizarIds(
      disciplinaMerged.professorIds,
      disciplinaMerged.professorId,
    );

    const responsavelIds = normalizarIds(
      disciplinaMerged.responsavelIds,
      disciplinaMerged.responsavelId,
    );

    const coordenadorIds = [
      ...new Set([
        ...normalizarIds(
          disciplinaMerged.coordenadorIds,
          disciplinaMerged.coordenadorId,
        ),
        ...normalizarIds([], disciplinaMerged.criado_por),
      ]),
    ];

    const criarRegistroResponsavel = (u, cargo, extras = {}) => ({
      userId: u.user ?? String(u.id).padStart(9, "0"),
      usuarioId: u.id,
      nome: u.nome ?? "",
      cargo,
      contato: u.contato || "",
      permissoes: {
        ...defaultPerms,
        ...(u.permissoes || {}),
      },
      fixo: false,
      removivel: true,
      ...extras,
    });

    const professoresBase = professorIds
      .map((id) => baseUsuarios.find((u) => Number(u.id) === Number(id)))
      .filter(Boolean)
      .map((u) => criarRegistroResponsavel(u, "Professor"));

    const responsaveisBase = responsavelIds
      .map((id) => baseUsuarios.find((u) => Number(u.id) === Number(id)))
      .filter(Boolean)
      .map((u) => criarRegistroResponsavel(u, "Responsável"));

    const coordenadoresBase = coordenadorIds
      .map((id) => baseUsuarios.find((u) => Number(u.id) === Number(id)))
      .filter(Boolean)
      .map((u) =>
        criarRegistroResponsavel(u, "Coordenador", {
          fixo: true,
          removivel: false,
        }),
      );

    const listaBase = [
      ...coordenadoresBase,
      ...professoresBase,
      ...responsaveisBase,
    ];

    const listaBaseUnica = listaBase.filter(
      (item, index, arr) =>
        arr.findIndex((x) => Number(x.usuarioId) === Number(item.usuarioId)) ===
        index,
    );

    const respOverride =
      turmaOverride && Array.isArray(turmaOverride.responsaveis)
        ? turmaOverride.responsaveis
        : null;

    const initialResponsaveis = respOverride
      ? respOverride.map((r) => ({
          userId: r.userId ?? "",
          usuarioId:
            r.usuarioId ?? (r.userId ? Number(r.userId) || null : null),
          nome: r.nome ?? "",
          cargo: r.cargo ?? "",
          contato: r.contato ?? "",
          permissoes: { ...defaultPerms, ...(r.permissoes || {}) },
          fixo: Boolean(r.fixo) || r.cargo === "Coordenador",
          removivel:
            r.removivel === false
              ? false
              : r.cargo === "Coordenador"
                ? false
                : true,
          coordenadorPadrao: Boolean(r.coordenadorPadrao),
          criadoPorTurma: Boolean(r.criadoPorTurma),
        }))
      : listaBaseUnica;

    const coordenadoresObrigatorios = coordenadoresBase.filter(
      (coord) =>
        !initialResponsaveis.some(
          (r) => Number(r.usuarioId) === Number(coord.usuarioId),
        ),
    );

    const normalized = [...initialResponsaveis, ...coordenadoresObrigatorios]
      .map((r) => ({
        userId: r.userId ?? "",
        usuarioId: r.usuarioId ?? (r.userId ? Number(r.userId) || null : null),
        nome: r.nome ?? "",
        cargo: r.cargo ?? "",
        contato: r.contato ?? "",
        permissoes: { ...defaultPerms, ...(r.permissoes || {}) },
        fixo: Boolean(r.fixo) || r.cargo === "Coordenador",
        removivel:
          r.removivel === false
            ? false
            : r.cargo === "Coordenador"
              ? false
              : true,
        coordenadorPadrao: Boolean(r.coordenadorPadrao),
        criadoPorTurma: Boolean(r.criadoPorTurma),
      }))
      .filter(
        (item, index, arr) =>
          arr.findIndex(
            (x) =>
              Number(x.usuarioId || 0) === Number(item.usuarioId || 0) &&
              String(x.cargo || "") === String(item.cargo || ""),
          ) === index,
      )
      .sort((a, b) => {
        const aCoord = a.cargo === "Coordenador" ? 0 : 1;
        const bCoord = b.cargo === "Coordenador" ? 0 : 1;
        return aCoord - bCoord;
      });

    setResponsaveis(normalized);

    const alunosBase = normalizarIds(
      disciplinaMerged.alunoIds,
      disciplinaMerged.alunoId,
    );

    const alunosOverrideMap = getTurmaAlunosOverride();
    const overrideIds = Array.isArray(alunosOverrideMap[String(turmaId)])
      ? alunosOverrideMap[String(turmaId)].map(Number)
      : null;

    setAlunosIds(overrideIds ?? alunosBase);
    setBuscaAluno("");
    setAlunoSelecionadoId(null);
    setLoading(false);
  }, [turmaId, disciplinaBase, baseUsuarios]);

  const alunosDetalhes = useMemo(() => {
    const mapUsuarios = new Map(baseUsuarios.map((u) => [Number(u.id), u]));

    return alunosIds
      .map((uid) => mapUsuarios.get(Number(uid)))
      .filter(Boolean)
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        matricula: u.user ?? String(u.id).padStart(9, "0"),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [alunosIds, baseUsuarios]);

  const candidatosBusca = useMemo(() => {
    const q = buscaAluno.trim().toLowerCase();
    if (!q) return [];

    const instituicaoId = disciplinaBase?.instituicaoId;
    const jaVinculados = new Set(alunosIds.map(Number));

    const candidatos = baseUsuarios.filter((u) =>
      instituicaoId ? Number(u.faculdadeId) === Number(instituicaoId) : true,
    );

    const filtrados = candidatos
      .filter((u) => !jaVinculados.has(Number(u.id)))
      .filter(
        (u) =>
          String(u.nome || "").toLowerCase().includes(q) ||
          String(u.id || "").includes(q) ||
          String(u.user || "").toLowerCase().includes(q),
      )
      .slice(0, 8);

    return filtrados.map((u) => ({
      id: u.id,
      nome: u.nome,
      matricula: u.user,
    }));
  }, [buscaAluno, baseUsuarios, disciplinaBase, alunosIds]);

  function persistTurma(partial) {
    if (!turmaId) return;
    upsertTurmaOverride(turmaId, partial);
  }

  function persistAlunos(nextIds) {
    if (!turmaId) return;
    const map = getTurmaAlunosOverride();
    map[String(turmaId)] = nextIds;
    setTurmaAlunosOverride(map);
  }

  const handleOpenImport = async () => {
  if (!fileInputRef.current) return;

  const htmlTutorial = `
    <div style="text-align:left; color:#334e68;">
      <div style="
        border:1px solid #e9edf3;
        border-radius:12px;
        padding:14px;
        background:#f8fbfe;
        margin-top:8px;
      ">
        <div style="font-size:15px; font-weight:700; margin-bottom:10px; color:#2e4a67;">
          Como importar a lista de alunos
        </div>

        <ol style="padding-left:18px; margin:0; line-height:1.7;">
          <li>Crie um arquivo <strong>Excel</strong> (.xlsx ou .xls).</li>
          <li>Preencha com os <strong>números de matrícula</strong> dos alunos.</li>
          <li>Informe <strong>uma matrícula por linha</strong> para evitar erros.</li>
          <li>Ao importar, o sistema vai mostrar quais alunos foram encontrados e quais entrarão na turma.</li>
        </ol>
      </div>

      <div style="
        margin-top:14px;
        border:1px dashed #cbd5e1;
        border-radius:12px;
        padding:14px;
        background:#fff;
      ">
        <div style="font-size:14px; font-weight:700; margin-bottom:8px; color:#2e4a67;">
          Exemplo do Excel
        </div>

        <div style="
          border:1px solid #e9edf3;
          border-radius:8px;
          overflow:hidden;
          font-size:13px;
        ">
          <div style="display:grid; grid-template-columns:60px 1fr; background:#eef6fc; font-weight:700;">
            <div style="padding:8px; border-right:1px solid #e9edf3;">Linha</div>
            <div style="padding:8px;">Matrícula</div>
          </div>
          <div style="display:grid; grid-template-columns:60px 1fr; border-top:1px solid #e9edf3;">
            <div style="padding:8px; border-right:1px solid #e9edf3;">1</div>
            <div style="padding:8px;">202610103</div>
          </div>
          <div style="display:grid; grid-template-columns:60px 1fr; border-top:1px solid #e9edf3;">
            <div style="padding:8px; border-right:1px solid #e9edf3;">2</div>
            <div style="padding:8px;">202610104</div>
          </div>
          <div style="display:grid; grid-template-columns:60px 1fr; border-top:1px solid #e9edf3;">
            <div style="padding:8px; border-right:1px solid #e9edf3;">3</div>
            <div style="padding:8px;">202610105</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const result = await Swal.fire({
    icon: "info",
    title: "Tutorial de importação",
    html: htmlTutorial,
    width: 760,
    showCancelButton: true,
    confirmButtonText: "Continuar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#76a9da",
    cancelButtonColor: "#d9dee5",
    background: "#ffffff",
    color: "#334e68",
    customClass: {
      popup: "swal-import-popup",
      title: "swal-import-title",
      confirmButton: "swal-import-confirm",
      cancelButton: "swal-import-cancel",
    },
  });

  if (!result.isConfirmed) return;

  fileInputRef.current.value = "";
  fileInputRef.current.click();
};

  const handleImportLista = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!turmaId || !user) {
      await Swal.fire({
        icon: "warning",
        title: "Turma não identificada",
        text: "Selecione uma turma antes de importar a lista.",
        confirmButtonColor: "#76a9da",
      });
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const firstSheetName = workbook.SheetNames?.[0];
      if (!firstSheetName) {
        await Swal.fire({
          icon: "warning",
          title: "Arquivo vazio",
          text: "Não foi encontrada nenhuma aba no arquivo enviado.",
          confirmButtonColor: "#76a9da",
        });
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: "",
      });

      const matriculasLidas = rows
        .flat()
        .map((cell) => normalizeMatricula(cell))
        .filter(Boolean);

      if (!matriculasLidas.length) {
        await Swal.fire({
          icon: "warning",
          title: "Nenhuma matrícula encontrada",
          text: "O arquivo não possui dados válidos para importação.",
          confirmButtonColor: "#76a9da",
        });
        return;
      }

      const matriculasUnicas = Array.from(new Set(matriculasLidas));

      const usuariosDaFaculdade = baseUsuarios.filter(
        (u) => Number(u.faculdadeId) === Number(user.faculdadeId),
      );

      const mapaPorMatricula = new Map(
        usuariosDaFaculdade.map((u) => [getUsuarioMatricula(u), u]),
      );

      const encontrados = [];
      const naoEncontrados = [];

      matriculasUnicas.forEach((matricula) => {
        const usuarioEncontrado = mapaPorMatricula.get(matricula);

        if (usuarioEncontrado) {
          encontrados.push(usuarioEncontrado);
        } else {
          naoEncontrados.push(matricula);
        }
      });

      const encontradosUnicos = encontrados.filter(
        (item, index, arr) =>
          arr.findIndex((x) => Number(x.id) === Number(item.id)) === index,
      );

      const novosIds = encontradosUnicos.map((u) => Number(u.id));
      const idsJaNaTurma = new Set(alunosIds.map(Number));

      const realmenteNovos = novosIds.filter(
        (id) => !idsJaNaTurma.has(Number(id)),
      );
      const jaExistiam = novosIds.filter((id) => idsJaNaTurma.has(Number(id)));

      const htmlEncontrados =
        encontradosUnicos.length > 0
          ? `
            <div style="text-align:left; margin-top:12px;">
              <div style="font-weight:700; color:#2e4a67; margin-bottom:8px;">
                Identificados na faculdade (${encontradosUnicos.length})
              </div>
              <div style="
                max-height:160px;
                overflow:auto;
                border:1px solid #e9edf3;
                border-radius:8px;
                padding:10px 12px;
                background:#f8fbfe;
                font-size:13px;
                color:#334e68;
              ">
                ${encontradosUnicos
                  .map(
                    (u) =>
                      `<div style="margin-bottom:6px;"><strong>${u.nome}</strong> — ${getUsuarioMatricula(u)}</div>`,
                  )
                  .join("")}
              </div>
            </div>
          `
          : "";

      const htmlNaoEncontrados =
        naoEncontrados.length > 0
          ? `
            <div style="text-align:left; margin-top:14px;">
              <div style="font-weight:700; color:#2e4a67; margin-bottom:8px;">
                Matrículas não identificadas (${naoEncontrados.length})
              </div>
              <div style="
                max-height:120px;
                overflow:auto;
                border:1px solid #e9edf3;
                border-radius:8px;
                padding:10px 12px;
                background:#fff;
                font-size:13px;
                color:#667085;
              ">
                ${naoEncontrados
                  .map(
                    (matricula) =>
                      `<div style="margin-bottom:6px;">${matricula}</div>`,
                  )
                  .join("")}
              </div>
            </div>
          `
          : "";

      const htmlResumo = `
        <div style="text-align:left;">
          <div style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            margin-top:8px;
          ">
            <div style="
              border:1px solid #e9edf3;
              border-radius:10px;
              padding:12px;
              background:#f8fbfe;
            ">
              <div style="font-size:12px; color:#667085;">Lidas no arquivo</div>
              <div style="font-size:20px; font-weight:700; color:#2e4a67;">${matriculasUnicas.length}</div>
            </div>

            <div style="
              border:1px solid #e9edf3;
              border-radius:10px;
              padding:12px;
              background:#f8fbfe;
            ">
              <div style="font-size:12px; color:#667085;">Encontradas</div>
              <div style="font-size:20px; font-weight:700; color:#2e4a67;">${encontradosUnicos.length}</div>
            </div>

            <div style="
              border:1px solid #e9edf3;
              border-radius:10px;
              padding:12px;
              background:#f8fbfe;
            ">
              <div style="font-size:12px; color:#667085;">Novos para adicionar</div>
              <div style="font-size:20px; font-weight:700; color:#2e4a67;">${realmenteNovos.length}</div>
            </div>

            <div style="
              border:1px solid #e9edf3;
              border-radius:10px;
              padding:12px;
              background:#f8fbfe;
            ">
              <div style="font-size:12px; color:#667085;">Já estavam na turma</div>
              <div style="font-size:20px; font-weight:700; color:#2e4a67;">${jaExistiam.length}</div>
            </div>
          </div>

          ${htmlEncontrados}
          ${htmlNaoEncontrados}
        </div>
      `;

      const result = await Swal.fire({
        icon: "info",
        title: "Conferir importação",
        html: htmlResumo,
        width: 760,
        showCancelButton: true,
        confirmButtonText: "Finalizar importação",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#76a9da",
        cancelButtonColor: "#d9dee5",
        background: "#ffffff",
        color: "#334e68",
        customClass: {
          popup: "swal-import-popup",
          title: "swal-import-title",
          confirmButton: "swal-import-confirm",
          cancelButton: "swal-import-cancel",
        },
      });

      if (!result.isConfirmed) return;

      if (!realmenteNovos.length) {
        await Swal.fire({
          icon: "info",
          title: "Nada para importar",
          text: "Todos os identificados já estavam vinculados à turma.",
          confirmButtonColor: "#76a9da",
        });
        return;
      }

      const next = Array.from(
        new Set([...alunosIds, ...realmenteNovos].map(Number)),
      );

      setAlunosIds(next);
      persistAlunos(next);

      await Swal.fire({
        icon: "success",
        title: "Importação concluída",
        text: `${realmenteNovos.length} aluno(s) foram adicionados à turma com sucesso.`,
        confirmButtonColor: "#76a9da",
      });
    } catch (error) {
      console.error(error);

      await Swal.fire({
        icon: "error",
        title: "Erro ao importar",
        text: "Não foi possível ler o arquivo Excel. Verifique se ele está no formato esperado.",
        confirmButtonColor: "#76a9da",
      });
    }
  };

  const handleSalvarTopo = () => {
    const nomeCompleto = buildNomeCompleto(nome, complemento);

    persistTurma({
      nome: nomeCompleto,
      nomeCustom: String(nome || "").trim(),
      complementoCustom: String(complemento || "").trim(),
      tipo: tipoTurma,
    });

    Swal.fire({
      icon: "success",
      title: "Turma atualizada",
      text: "As informações foram salvas.",
      timer: 1000,
      showConfirmButton: false,
    });
  };

  const handleChangeTipo = (valor) => {
    setTipoTurma(valor);
    persistTurma({ tipo: valor });
  };

  const handleAdicionarAluno = () => {
    if (!alunoSelecionadoId) {
      Swal.fire({
        icon: "warning",
        title: "Selecione um aluno",
        text: "Busque e selecione um aluno antes de adicionar.",
      });
      return;
    }

    const next = Array.from(
      new Set([...alunosIds, Number(alunoSelecionadoId)]),
    );

    setAlunosIds(next);
    persistAlunos(next);
    setBuscaAluno("");
    setAlunoSelecionadoId(null);
    setDropdownOpen(false);

    Swal.fire({
      icon: "success",
      title: "Aluno adicionado",
      text: "O aluno foi adicionado à turma.",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const handleRemoverAluno = (uid) => {
    const next = alunosIds.filter((id) => Number(id) !== Number(uid));
    setAlunosIds(next);
    persistAlunos(next);
  };

  const handleSaveResponsavelFromModal = (payload) => {
    const normalized = {
      userId: payload.userId ?? "",
      usuarioId: payload.usuarioId ?? null,
      nome: payload.nome ?? "",
      cargo: payload.cargo ?? "",
      contato: payload.contato ?? "",
      permissoes: { ...defaultPerms, ...(payload.permissoes || {}) },
      fixo: Boolean(payload.fixo) || payload.cargo === "Coordenador",
      removivel:
        payload.removivel === false
          ? false
          : payload.cargo === "Coordenador"
            ? false
            : true,
    };

    if (modalMode === "add") {
      const next = [...responsaveis, normalized];
      setResponsaveis(next);
      persistTurma({ responsaveis: next });
      closeModal();
      return;
    }

    if (editIndex === null) return;

    const atual = responsaveis[editIndex];
    const isCoordenadorFixo =
      atual?.cargo === "Coordenador" ||
      atual?.removivel === false ||
      atual?.fixo === true;

    const next = [...responsaveis];

    next[editIndex] = isCoordenadorFixo
      ? {
          ...atual,
          userId: atual.userId,
          usuarioId: atual.usuarioId,
          nome: atual.nome,
          cargo: "Coordenador",
          fixo: true,
          removivel: false,
          contato: payload.contato ?? atual.contato,
          permissoes: {
            ...defaultPerms,
            ...(payload.permissoes || atual.permissoes || {}),
          },
        }
      : {
          ...next[editIndex],
          ...normalized,
        };

    setResponsaveis(next);
    persistTurma({ responsaveis: next });
    closeModal();
  };

  const handleRemoveResponsavelFromModal = () => {
    if (editIndex === null) return;

    const atual = responsaveis[editIndex];

    if (atual?.cargo === "Coordenador" || atual?.removivel === false) {
      Swal.fire({
        icon: "warning",
        title: "Coordenador obrigatório",
        text: "O coordenador da turma sempre deve aparecer e não pode ser removido.",
      });
      return;
    }

    const next = responsaveis.filter((_, i) => i !== editIndex);
    setResponsaveis(next);
    persistTurma({ responsaveis: next });
    closeModal();
  };

  if (!user) {
    return (
      <div className="editar-turma-page">
        {isCoordenador && (
          <button
            type="button"
            className="btn-voltar-coordenador"
            onClick={() => navigate("/editar-turma-coordenador")}
          >
            ← Voltar
          </button>
        )}

        <div className="editar-turma-box">
          <header className="page-header">
            <h1>Editar turma</h1>
          </header>
          <p className="empty-text">Usuário não identificado.</p>
        </div>
      </div>
    );
  }

  if (!turmaId) {
    return (
      <div className="editar-turma-page">
        {isCoordenador && (
          <button
            type="button"
            className="btn-voltar-coordenador"
            onClick={() => navigate("/editar-turma-coordenador")}
          >
            ← Voltar
          </button>
        )}

        <div className="editar-turma-box">
          <header className="page-header">
            <h1>Editar turma</h1>
          </header>
          <p className="empty-text">Nenhuma turma selecionada.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="editar-turma-page">
        <div className="editar-turma-box">
          <div className="skeleton-title" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      </div>
    );
  }

  if (!disciplinaBase) {
    return (
      <div className="editar-turma-page">
        {isCoordenador && (
          <button
            type="button"
            className="btn-voltar-coordenador"
            onClick={() => navigate("/editar-turma-coordenador")}
          >
            ← Voltar
          </button>
        )}

        <div className="editar-turma-box">
          <header className="page-header">
            <h1>Editar turma</h1>
          </header>
          <p className="empty-text">Turma não encontrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`editar-turma-page ${
        isCoordenador
          ? "editar-turma-page--coordenador"
          : "editar-turma-page--padrao"
      }`}
    >
      {isCoordenador && (
        <button
          type="button"
          className="btn-voltar-coordenador"
          onClick={() => navigate("/editar-turma-coordenador")}
        >
          ← Voltar
        </button>
      )}

      <section className="editar-turma-box editar-turma-box--info">
        <header className="page-header">
          <h1>Editar turma</h1>
        </header>

        <div className="bloco-header">
          <h2>Informações da Turma</h2>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={handleSalvarTopo}
              placeholder="Nome da turma"
            />
          </div>

          <div className="field">
            <label>Complemento</label>
            <input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              onBlur={handleSalvarTopo}
              placeholder="Turma 8"
            />
          </div>
        </div>

        {isCoordenador && (
          <div className="tipo-area">
            <div className="tipo-label">Selecione o tipo</div>

            <div className="radio-group">
              <label className="radio-item">
                <input
                  type="radio"
                  name="tipoTurma"
                  checked={tipoTurma === "primaria"}
                  onChange={() => handleChangeTipo("primaria")}
                />
                <span>Primária</span>
              </label>

              <label className="radio-item">
                <input
                  type="radio"
                  name="tipoTurma"
                  checked={tipoTurma === "secundaria"}
                  onChange={() => handleChangeTipo("secundaria")}
                />
                <span>Secundária</span>
              </label>
            </div>
          </div>
        )}
      </section>

      <section className="editar-turma-box editar-turma-box--responsaveis">
        <div className="bloco-header">
          <h2>Responsáveis da turma</h2>
        </div>

        <div className="responsaveis">
          {responsaveis.length > 0 ? (
            responsaveis.map((r, idx) => {
              const cargoNormalizado = String(r.cargo || "").toLowerCase();

              const tipoClasse =
                r.cargo === "Coordenador"
                  ? "responsavel-card--coordenador"
                  : "responsavel-card--simples";

              const cargoClasse =
                cargoNormalizado === "professor"
                  ? "responsavel-card--professor"
                  : cargoNormalizado === "responsável" ||
                      cargoNormalizado === "responsavel"
                    ? "responsavel-card--responsavel"
                    : "";

              return (
                <div
                  className={`responsavel-card ${tipoClasse} ${cargoClasse}`}
                  key={`${r.usuarioId || r.userId}-${idx}`}
                >
                  <div className="responsavel-top">
                    <span className="chip">{r.nome || "Responsável"}</span>

                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => openEditarResponsavel(idx)}
                      aria-label="Editar responsável"
                      title="Editar"
                    >
                      <Pencil size={10} />
                      <span className="btn-edit__text">Editar</span>
                    </button>
                  </div>

                  <div className="grid-2 inner">
                    <div className="field">
                      <label>Cargo</label>
                      <input value={r.cargo || ""} readOnly />
                    </div>

                    <div className="field">
                      <label>Contato</label>
                      <input value={r.contato || ""} readOnly />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-small">Nenhum responsável adicionado.</div>
          )}
        </div>

        <button
          type="button"
          className="btn-primary wide responsavel-add-btn"
          onClick={openAdicionarResponsavel}
        >
          Adicionar responsável
        </button>
      </section>

      <section className="editar-turma-box editar-turma-box--alunos">
        <div className="section-head">
          <h2>Lista de Alunos</h2>

          <button
            type="button"
            className="btn-importar"
            onClick={handleOpenImport}
          >
            <Upload size={14} />
            Importar lista
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={handleImportLista}
        />

        <div className="subsection">
          <p className="sub-title">Adicione alunos</p>

          <div className="add-aluno-actions">
            <div className="search-wrap" ref={searchWrapRef}>
              <Search className="search-ico" />
              <input
                type="text"
                value={buscaAluno}
                onChange={(e) => {
                  setBuscaAluno(e.target.value);
                  setDropdownOpen(true);
                  setAlunoSelecionadoId(null);
                }}
                onFocus={() => {
                  if (buscaAluno.trim()) setDropdownOpen(true);
                }}
                placeholder="Pesquise nome, matrícula ou email..."
              />

              {dropdownOpen && candidatosBusca.length > 0 && (
                <div className="search-dropdown">
                  {candidatosBusca.map((aluno) => {
                    const ativo =
                      Number(alunoSelecionadoId) === Number(aluno.id);

                    return (
                      <button
                        type="button"
                        key={aluno.id}
                        className={`dropdown-item ${ativo ? "active" : ""}`}
                        onClick={() => {
                          setBuscaAluno(`${aluno.nome} - ${aluno.matricula}`);
                          setAlunoSelecionadoId(aluno.id);
                          setDropdownOpen(false);
                        }}
                      >
                        <span className="d-name">{aluno.nome}</span>
                        <span className="d-sub">{aluno.matricula}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              className={`btn-primary add-aluno-btn ${
                temAlunoSelecionado ? "is-active" : "is-muted"
              }`}
              onClick={handleAdicionarAluno}
              disabled={!temAlunoSelecionado}
            >
              Adicionar aluno
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn-ver-lista"
          onClick={() => navigate(`/turma/${turmaId}/alunos`)}
        >
          Ver lista completa de alunos
        </button>

        <div className="alunos-list">
          {alunosDetalhes.length > 0 ? (
            alunosDetalhes.map((aluno) => (
              <div className="aluno-row" key={aluno.id}>
                <div className="aluno-info">
                  <span className="aluno-nome">{aluno.nome}</span>
                  <span className="aluno-matricula">{aluno.matricula}</span>
                </div>

                <button
                  type="button"
                  className="btn-x"
                  onClick={() => handleRemoverAluno(aluno.id)}
                  aria-label={`Remover ${aluno.nome}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-small">Nenhum aluno adicionado.</div>
          )}
        </div>
      </section>

      <EditarResponsavelModal
        open={modalOpen}
        onClose={closeModal}
        usuarios={usuariosComUser}
        initialValue={
          modalMode === "edit" && editIndex !== null
            ? responsaveis[editIndex]
            : null
        }
        onSave={handleSaveResponsavelFromModal}
        onRemove={
          modalMode === "edit" && responsaveis[editIndex]?.removivel !== false
            ? handleRemoveResponsavelFromModal
            : null
        }
        bloquearResponsavel={
          modalMode === "edit" &&
          (responsaveis[editIndex]?.cargo === "Coordenador" ||
            responsaveis[editIndex]?.fixo === true ||
            responsaveis[editIndex]?.removivel === false)
        }
        bloquearRemocao={
          modalMode === "edit" &&
          (responsaveis[editIndex]?.cargo === "Coordenador" ||
            responsaveis[editIndex]?.fixo === true ||
            responsaveis[editIndex]?.removivel === false)
        }
        podeEditarCargo={isCoordenador}
      />
    </div>
  );
}