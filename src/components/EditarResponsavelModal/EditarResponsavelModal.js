import React, { useEffect, useMemo, useState } from "react";
import "./EditarResponsavelModal.scss";
import { X } from "lucide-react";

const defaultPerms = {
  eventos: true, // Pode criar e editar eventos
  responsaveis: false, // Pode gerenciar responsáveis
  alunos: true, // Pode editar lista de alunos
};

export default function EditarResponsavelModal({
  open,
  onClose,
  usuarios = [],
  initialValue = null, // { userId, nome, cargo, contato, permissoes }
  onSave,
  onRemove,
}) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!open) return;

    const iv = initialValue || {};
    setDraft({
      userId: iv.userId ?? "",
      nome: iv.nome ?? "",
      cargo: iv.cargo ?? "",
      contato: iv.contato ?? "",
      permissoes: {
        ...defaultPerms,
        ...(iv.permissoes || {}),
      },
    });
  }, [open, initialValue]);

  const opcoes = useMemo(() => {
    return (usuarios || [])
      .filter((u) => ["professor", "responsavel", "coordenador"].includes(u.tipo))
      .map((u) => ({ id: u.id, nome: u.nome, tipo: u.tipo, contato: u.contato || "" }));
  }, [usuarios]);

  const usuarioSelecionado = useMemo(() => {
    if (!draft?.userId) return null;
    return opcoes.find((o) => Number(o.id) === Number(draft.userId)) || null;
  }, [draft?.userId, opcoes]);

  if (!open) return null;
  if (!draft) return null;

  const handleOverlayClick = (e) => {
    if (e.target?.classList?.contains("erm__overlay")) onClose?.();
  };

  const handleChangeUser = (e) => {
    const nextId = e.target.value;
    const selected = opcoes.find((o) => String(o.id) === String(nextId));

    setDraft((prev) => ({
      ...prev,
      userId: nextId,
      nome: selected?.nome || "",
      contato: selected?.contato || prev.contato,
      cargo:
        prev.cargo ||
        (selected?.tipo === "professor"
          ? "Professor"
          : selected?.tipo === "responsavel"
            ? "Responsável"
            : selected?.tipo === "coordenador"
              ? "Coordenador"
              : ""),
    }));
  };

  const clearUser = () => {
    setDraft((prev) => ({
      ...prev,
      userId: "",
      nome: "",
    }));
  };

  const togglePerm = (key) => {
    setDraft((prev) => ({
      ...prev,
      permissoes: { ...prev.permissoes, [key]: !prev.permissoes[key] },
    }));
  };

  const save = () => {
    // validações simples
    if (!draft.userId) return;

    onSave?.({
      userId: Number(draft.userId),
      nome: draft.nome,
      cargo: draft.cargo,
      contato: draft.contato,
      permissoes: { ...draft.permissoes },
    });
  };

  return (
    <div className="erm__overlay" onMouseDown={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="erm__modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="erm__close" type="button" onClick={onClose} aria-label="Fechar">
          <X size={16} />
        </button>

        <div className="erm__header">
          <div className="erm__title">Editar responsável</div>
          <div className="erm__subtitle">Revise os dados do responsável</div>
        </div>

        <div className="erm__body">
          <div className="erm__field">
            <label>Responsável</label>

            <div className="erm__inputWrap">
              <select value={draft.userId} onChange={handleChangeUser}>
                <option value="">Selecione...</option>
                {opcoes.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.nome}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="erm__clear"
                onClick={clearUser}
                aria-label="Limpar responsável"
                title="Limpar"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="erm__field">
            <label>Cargo</label>
            <input
              value={draft.cargo}
              onChange={(e) => setDraft((p) => ({ ...p, cargo: e.target.value }))}
              placeholder="Ex.: Professor"
            />
          </div>

          <div className="erm__field">
            <label>Contato</label>
            <input
              value={draft.contato}
              onChange={(e) => setDraft((p) => ({ ...p, contato: e.target.value }))}
              placeholder="Ex.: (61) 99999-9999"
            />
          </div>

          <div className="erm__divider" />

          <div className="erm__perms">
            <div className="erm__permsTitle">Permissões</div>
            <div className="erm__permsSubtitle">Selecione as permissões desse responsável</div>

            <div className="erm__checks">
              <label className="erm__check">
                <input
                  type="checkbox"
                  checked={!!draft.permissoes.eventos}
                  onChange={() => togglePerm("eventos")}
                />
                <span className="erm__checkBox" aria-hidden="true" />
                <span>Pode criar e editar eventos</span>
              </label>

              <label className="erm__check">
                <input
                  type="checkbox"
                  checked={!!draft.permissoes.responsaveis}
                  onChange={() => togglePerm("responsaveis")}
                />
                <span className="erm__checkBox" aria-hidden="true" />
                <span>Pode gerenciar responsáveis</span>
              </label>

              <label className="erm__check">
                <input
                  type="checkbox"
                  checked={!!draft.permissoes.alunos}
                  onChange={() => togglePerm("alunos")}
                />
                <span className="erm__checkBox" aria-hidden="true" />
                <span>Pode editar lista de alunos</span>
              </label>
            </div>
          </div>
        </div>

        <div className="erm__footer">

          <button
            type="button"
            className={`erm__btn erm__btn--primary ${!draft.userId ? "is-disabled" : ""}`}
            onClick={save}
            disabled={!draft.userId}
          >
            Salvar Responsável
          </button>
        </div>
      </div>
    </div>
  );
}
