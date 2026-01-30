import React, { useEffect, useMemo, useRef, useState } from "react";
import "./EditarResponsavelModal.scss";
import { X, Search, Trash2 } from "lucide-react";

const defaultPerms = {
  eventos: true,
  responsaveis: false,
  alunos: true,
};

const CARGOS = ["Professor", "Responsável", "Coordenador"];

// ✅ ajuste para a SUA chave real no localStorage
const RESPONSAVEIS_STORAGE_KEY = "responsaveis_v1";

export default function EditarResponsavelModal({
  open,
  onClose,
  usuarios = [],
  initialValue = null,
  onSave,
  onRemove,
}) {
  const [draft, setDraft] = useState(null);

  const [queryUser, setQueryUser] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const iv = initialValue || {};
    const next = {
      userId: iv.userId ?? "", // login (string)
      nome: iv.nome ?? "",
      cargo: iv.cargo ?? "",
      contato: iv.contato ?? "",
      permissoes: {
        ...defaultPerms,
        ...(iv.permissoes || {}),
      },
    };

    setDraft(next);
    setQueryUser(next.nome || "");
    setDropdownOpen(false);
  }, [open, initialValue]);

  const opcoes = useMemo(() => {
    return (usuarios || [])
      .filter((u) =>
        ["professor", "responsavel", "coordenador"].includes(u.tipo),
      )
      .map((u) => ({
        user: u.user ?? u.login ?? u.username ?? "",
        nome: u.nome,
        tipo: u.tipo,
        contato: u.contato || "",
      }))
      .filter((o) => !!o.user);
  }, [usuarios]);

  const candidatos = useMemo(() => {
    const q = queryUser.trim().toLowerCase();
    if (!q) return [];

    return opcoes
      .filter(
        (o) =>
          o.nome?.toLowerCase().includes(q) ||
          o.user?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [queryUser, opcoes]);

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(e.target)) setDropdownOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  if (!open) return null;
  if (!draft) return null;

  const handleOverlayClick = (e) => {
    if (e.target?.classList?.contains("erm__overlay")) onClose?.();
  };

  const pickUser = (o) => {
    setDraft((prev) => ({
      ...prev,
      userId: o.user,
      nome: o.nome,
      cargo:
        prev.cargo ||
        (o.tipo === "professor"
          ? "Professor"
          : o.tipo === "responsavel"
            ? "Responsável"
            : o.tipo === "coordenador"
              ? "Coordenador"
              : ""),
      contato: prev.cargo ? o.contato || prev.contato : prev.contato,
    }));

    setQueryUser(o.nome);
    setDropdownOpen(false);
  };

  const clearUser = () => {
    setDraft((prev) => ({ ...prev, userId: "", nome: "" }));
    setQueryUser("");
    setDropdownOpen(false);
  };

  const togglePerm = (key) => {
    setDraft((prev) => ({
      ...prev,
      permissoes: { ...prev.permissoes, [key]: !prev.permissoes[key] },
    }));
  };

  const handleChangeCargo = (e) => {
    const value = e.target.value;
    setDraft((prev) => ({
      ...prev,
      cargo: value,
      contato: value ? prev.contato : "",
    }));
  };

  const save = () => {
    if (!draft.userId) return;

    onSave?.({
      userId: String(draft.userId),
      nome: draft.nome,
      cargo: draft.cargo,
      contato: draft.contato,
      permissoes: { ...draft.permissoes },
    });
  };

  // ✅ remove + persiste no localStorage
  const remove = () => {
    if (!draft.userId) return;

    // 1) callback pra você atualizar estado/UI no pai
    onRemove?.(String(draft.userId));

    // 2) persistência no storage (ajuste a estrutura conforme seu projeto)
    try {
      const raw = localStorage.getItem(RESPONSAVEIS_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];

      const nextArr = Array.isArray(arr)
        ? arr.filter((r) => String(r.userId) !== String(draft.userId))
        : [];

      localStorage.setItem(RESPONSAVEIS_STORAGE_KEY, JSON.stringify(nextArr));
    } catch (e) {
      // se der erro, pelo menos remove no estado do pai via onRemove
      console.error("Erro ao remover responsável do storage:", e);
    }

    onClose?.();
  };

  return (
    <div
      className="erm__overlay"
      onMouseDown={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="erm__modal" onMouseDown={(e) => e.stopPropagation()}>
        <button
          className="erm__close"
          type="button"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={16} />
        </button>

        <div className="erm__header">
          <div className="erm__title">Editar responsável</div>
          <div className="erm__subtitle">Revise os dados do responsável</div>
        </div>

        <div className="erm__body">
          {/* RESPONSÁVEL */}
          <div className="erm__field" ref={searchRef}>
            <label>Responsável</label>

            <div className="erm__searchWrap">
              <Search size={14} className="erm__searchIco" />

              <input
                value={queryUser}
                onChange={(e) => {
                  setQueryUser(e.target.value);
                  setDropdownOpen(true);
                  setDraft((prev) => ({
                    ...prev,
                    userId: "",
                    nome: e.target.value,
                  }));
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Digite para buscar..."
                autoComplete="off"
              />

              <button
                type="button"
                className="erm__clear"
                onClick={clearUser}
                aria-label="Limpar"
                title="Limpar"
              >
                <X size={14} />
              </button>

              {dropdownOpen && candidatos.length > 0 && (
                <div className="erm__dropdown">
                  {candidatos.map((o) => (
                    <button
                      key={o.user}
                      type="button"
                      className={`erm__item ${String(draft.userId) === String(o.user) ? "is-active" : ""}`}
                      onClick={() => pickUser(o)}
                    >
                      <div className="erm__itemName">{o.nome}</div>
                      <div className="erm__itemSub">{o.user}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CARGO */}
          <div className="erm__field">
            <label>Cargo</label>
            <input
              type="text"
              value={draft.cargo}
              onChange={handleChangeCargo}
              placeholder="Ex.: Professor, Coordenador, Responsável..."
            />
          </div>

          {/* CONTATO */}
          {draft.cargo ? (
            <div className="erm__field">
              <label>Contato</label>
              <input
                value={draft.contato}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, contato: e.target.value }))
                }
                placeholder="Ex.: (61) 99999-9999"
              />
            </div>
          ) : null}

          <div className="erm__divider" />

          {/* PERMS */}
          <div className="erm__perms">
            <div className="erm__permsTitle">Permissões</div>
            <div className="erm__permsSubtitle">
              Selecione as permissões desse responsável
            </div>

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

        {/* ✅ FOOTER IGUAL FIGMA: remover (ghost/danger) + salvar (primary) alinhado à direita */}
        <div className="erm__footer">
          {!!draft.userId && !!onRemove && (
            <button
              type="button"
              className="erm__btn erm__btn--dangerGhost"
              onClick={remove}
            >
              Remover responsável
            </button>
          )}

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
