import React, { useRef } from "react";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

function normalizeMatricula(value) {
  return String(value || "").trim();
}

function getUsuarioMatricula(u) {
  return normalizeMatricula(u?.user);
}

export default function ImportarAlunos({
  usuarios = [],
  faculdadeId,
  idsJaExistentes = [],
  buttonLabel = "Importar lista",
  className = "",
  onImportConfirm,
}) {
  const fileInputRef = useRef(null);

  const handleOpenImport = async () => {
    if (!fileInputRef.current) return;

    const htmlTutorial = `
      <div style="text-align:left; color:#334e68;">
        <div style="border:1px solid #e9edf3; border-radius:12px; padding:14px; background:#f8fbfe; margin-top:8px;">
          <div style="font-size:15px; font-weight:700; margin-bottom:10px; color:#2e4a67;">
            Como importar a lista de alunos
          </div>

          <ol style="padding-left:18px; margin:0; line-height:1.7;">
            <li>Crie um arquivo <strong>Excel</strong> (.xlsx ou .xls).</li>
            <li>Preencha com os <strong>números de matrícula</strong> dos alunos.</li>
            <li>Informe <strong>uma matrícula por linha</strong> para evitar erros.</li>
            <li>Ao importar, o sistema vai mostrar quais alunos foram encontrados.</li>
          </ol>
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
    });

    if (!result.isConfirmed) return;

    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleImportLista = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!faculdadeId) {
      await Swal.fire({
        icon: "warning",
        title: "Faculdade não identificada",
        text: "Não foi possível validar os alunos da importação.",
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

      const usuariosDaFaculdade = usuarios.filter(
        (u) => Number(u.faculdadeId) === Number(faculdadeId)
      );

      const mapaPorMatricula = new Map(
        usuariosDaFaculdade.map((u) => [getUsuarioMatricula(u), u])
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
          arr.findIndex((x) => Number(x.id) === Number(item.id)) === index
      );

      const novosIds = encontradosUnicos.map((u) => Number(u.id));
      const idsAtuais = new Set(idsJaExistentes.map(Number));

      const realmenteNovos = novosIds.filter((id) => !idsAtuais.has(Number(id)));
      const jaExistiam = novosIds.filter((id) => idsAtuais.has(Number(id)));

      const htmlResumo = `
        <div style="text-align:left;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
            <div style="border:1px solid #e9edf3; border-radius:10px; padding:12px; background:#f8fbfe;">
              <div style="font-size:12px; color:#667085;">Lidas no arquivo</div>
              <div style="font-size:20px; font-weight:700; color:#2e4a67;">${matriculasUnicas.length}</div>
            </div>

            <div style="border:1px solid #e9edf3; border-radius:10px; padding:12px; background:#f8fbfe;">
              <div style="font-size:12px; color:#667085;">Encontradas</div>
              <div style="font-size:20px; font-weight:700; color:#2e4a67;">${encontradosUnicos.length}</div>
            </div>

            <div style="border:1px solid #e9edf3; border-radius:10px; padding:12px; background:#f8fbfe;">
              <div style="font-size:12px; color:#667085;">Novos para adicionar</div>
              <div style="font-size:20px; font-weight:700; color:#2e4a67;">${realmenteNovos.length}</div>
            </div>

            <div style="border:1px solid #e9edf3; border-radius:10px; padding:12px; background:#f8fbfe;">
              <div style="font-size:12px; color:#667085;">Já estavam na lista</div>
              <div style="font-size:20px; font-weight:700; color:#2e4a67;">${jaExistiam.length}</div>
            </div>
          </div>
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
      });

      if (!result.isConfirmed) return;

      if (!realmenteNovos.length) {
        await Swal.fire({
          icon: "info",
          title: "Nada para importar",
          text: "Todos os identificados já estavam vinculados.",
          confirmButtonColor: "#76a9da",
        });
        return;
      }

      onImportConfirm?.(realmenteNovos, {
        encontrados: encontradosUnicos,
        naoEncontrados,
        matriculasLidas: matriculasUnicas,
        jaExistiam,
      });

      await Swal.fire({
        icon: "success",
        title: "Importação concluída",
        text: `${realmenteNovos.length} aluno(s) foram adicionados com sucesso.`,
        confirmButtonColor: "#76a9da",
      });
    } catch (error) {
      console.error(error);

      await Swal.fire({
        icon: "error",
        title: "Erro ao importar",
        text: "Não foi possível ler o arquivo Excel.",
        confirmButtonColor: "#76a9da",
      });
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleOpenImport}
      >
        <Upload size={14} />
        {buttonLabel}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleImportLista}
      />
    </>
  );
}