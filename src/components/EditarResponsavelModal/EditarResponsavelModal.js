import React, { useEffect, useMemo, useRef, useState } from "react";
import "./EditarResponsavelModal.scss";
import { X, Search } from "lucide-react";

const defaultPerms = {
  eventos: true,
  responsaveis: false,
  alunos: true,
};

// ✅ ajuste para a SUA chave real no localStorage
const RESPONSAVEIS_STORAGE_KEY = "responsaveis_v1";

export default function EditarResponsavelModal({
  open,
  onClose,
  usuarios = [],
  initialValue = null,
  onSave,
  onRemove,
  bloquearResponsavel = false,
  bloquearRemocao = false,
}) {
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});

  const [queryUser, setQueryUser] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  const isAdd = !initialValue;

  const responsavelTravado =
  !!bloquearResponsavel &&
  (
    initialValue?.cargo === "Coordenador" ||
    initialValue?.fixo === true ||
    initialValue?.removivel === false
  );

  useEffect(() => {
    if (!open) return;

    const iv = initialValue || {};
    const isAdd = !initialValue;

    const next = {
      userId: iv.userId ?? "",
      // ✅ ao adicionar novo: NÃO autopreenche nome
      nome: isAdd ? "" : (iv.nome ?? ""),
      cargo: iv.cargo ?? "",
      contato: iv.contato ?? "",
      permissoes: isAdd
        ? {
            eventos: false,
            responsaveis: false,
            alunos: false,
          }
        : {
            ...defaultPerms,
            ...(iv.permissoes || {}),
          },
    };

    setDraft(next);
    setErrors({});
    // ✅ ao adicionar novo: input de busca vem vazio
    setQueryUser(isAdd ? "" : next.nome || "");
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

  // ✅ ao selecionar, só preenche userId e nome (NÃO sugere cargo nem contato)
  const pickUser = (o) => {
  if (responsavelTravado) return;

  setDraft((prev) => ({
    ...prev,
    userId: o.user,
    nome: o.nome,
  }));
  setQueryUser(o.nome);
  setDropdownOpen(false);
};

 const clearUser = () => {
  if (responsavelTravado) return;

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
  if (responsavelTravado) return;

  const value = e.target.value;
  setDraft((prev) => ({ ...prev, cargo: value }));
  setErrors((prev) => ({ ...prev, cargo: undefined }));
};

  const validate = () => {
    const next = {};

    const contatoTrim = String(draft.contato || "").trim();
    const cargoTrim = String(draft.cargo || "").trim();

    // ✅ REGRA NOVA (invertida):
    // Se contato estiver preenchido -> cargo obrigatório
    if (contatoTrim && !cargoTrim) {
      next.cargo = "Cargo é obrigatório quando houver contato.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!draft.userId) return;
    if (!validate()) return;

    onSave?.({
      userId: String(draft.userId),
      nome: String(draft.nome || "").trim(),
      cargo: String(draft.cargo || "").trim(),
      contato: String(draft.contato || "").trim(),
      permissoes: { ...draft.permissoes },
    });
  };

  const remove = () => {
    if (!draft.userId) return;

    onRemove?.(String(draft.userId));

    try {
      const raw = localStorage.getItem(RESPONSAVEIS_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];

      const nextArr = Array.isArray(arr)
        ? arr.filter((r) => String(r.userId) !== String(draft.userId))
        : [];

      localStorage.setItem(RESPONSAVEIS_STORAGE_KEY, JSON.stringify(nextArr));
    } catch (e) {
      console.error("Erro ao remover responsável do storage:", e);
    }

    onClose?.();
  };

  const hasContato = !!String(draft.contato || "").trim();

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
          <div className="erm__title">
            {isAdd ? "Adicionar responsável" : "Editar responsável"}
          </div>
          <div className="erm__subtitle">
            {isAdd
              ? "Preencha os dados do novo responsável"
              : "Revise os dados do responsável"}
          </div>
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
                  if (responsavelTravado) return;

                  const v = e.target.value;
                  setQueryUser(v);
                  setDropdownOpen(true);

                  setDraft((prev) => ({
                    ...prev,
                    userId: "",
                    nome: v,
                  }));
                }}
                onFocus={() => {
                  if (responsavelTravado) return;
                  setDropdownOpen(true);
                }}
                placeholder="Digite para buscar..."
                autoComplete="off"
                disabled={responsavelTravado}
              />

              <button
                type="button"
                className="erm__clear"
                onClick={clearUser}
                aria-label="Limpar"
                title="Limpar"
                disabled={responsavelTravado}
              >
                <X size={14} />
              </button>

              {!responsavelTravado && dropdownOpen && candidatos.length > 0 && (
                <div className="erm__dropdown">
                  {candidatos.map((o) => (
                    <button
                      key={o.user}
                      type="button"
                      className={`erm__item ${
                        String(draft.userId) === String(o.user)
                          ? "is-active"
                          : ""
                      }`}
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

          {/* CARGO (DIGITÁVEL) */}
         <div className="erm__field">
  <label>Cargo</label>

  <div className="erm__inputWrap">
    <input
      type="text"
      value={draft.cargo}
      onChange={handleChangeCargo}
      placeholder="Digite o cargo"
      aria-invalid={!!errors.cargo}
      disabled={responsavelTravado}
      readOnly={responsavelTravado}
    />
  </div>

  {errors.cargo ? (
    <div className="erm__fieldError">{errors.cargo}</div>
  ) : null}
</div>

          {/* CONTATO */}
          <div className="erm__field">
            <label>Contato</label>
            <input
              value={draft.contato}
              onChange={(e) => {
                const v = e.target.value;
                setDraft((p) => ({ ...p, contato: v }));

                // ✅ se existe erro de cargo e o contato mudou, revalida visualmente (remove erro só se contato ficou vazio)
                if (errors.cargo) {
                  const contatoTrim = String(v || "").trim();
                  if (!contatoTrim)
                    setErrors((p) => ({ ...p, cargo: undefined }));
                }
              }}
              placeholder="Telefone, e-mail ou WhatsApp"
              aria-invalid={!!errors.cargo}
            />
          </div>

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

        <div className="erm__footer">
         {!!draft.userId && !!onRemove && !bloquearRemocao && (
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
