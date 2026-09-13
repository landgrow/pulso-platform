"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  updateProperty,
  updateFieldVisibility,
  updateBoardViewConfig,
} from "@/app/actions/boards";
import { listTeamMembers } from "@/app/actions/team";
import { BUILTIN_FIELDS, PRIORIDADE_LABELS, type Board } from "@/types/boards";
import { SETOR_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  COLOR_RULE_SWATCHES,
  GROUP_BY_LABELS,
  SORT_FIELD_META,
  type ColorRule,
  type GroupByField,
  type SortRule,
} from "@/types/board-view";

/** Aba Equipe — quem pode ser Responsável (mesmo time da plataforma, gerenciado em /admin/equipe). */
export function EquipeTab(): JSX.Element {
  const [team, setTeam] = useState<
    { userId: string; fullName: string | null; email: string; role: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<void> {
    setLoading(true);
    const result = await listTeamMembers();
    if (result.success)
      setTeam(
        result.data.map((t) => ({
          userId: t.userId,
          fullName: t.fullName,
          email: t.email,
          role: t.role,
        })),
      );
    else toast.error(result.error);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() sets loading state, only runs on mount
    void refresh();
  }, []);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Pessoas do time</h4>
      <p className="text-xs text-text-2">
        Quem pode ser Responsável por uma tarefa — mesmo time da plataforma.
        Gerencie em{" "}
        <a href="/admin/equipe" className="text-primary hover:underline">
          Equipe
        </a>
        .
      </p>
      {loading ? (
        <p className="text-xs text-text-2 py-2">Carregando...</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {team.map((t) => (
            <div
              key={t.userId}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span>{t.fullName ?? t.email}</span>
              <span className="text-[10px] uppercase tracking-wide text-text-2">
                {t.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Aba Visibilidade — quais campos aparecem como coluna na vista Tabela (mesma lista da aba Layout, sem reordenar). */
export function VisibilidadeTab({
  board,
  onChanged,
}: {
  board: Board;
  onChanged: () => void;
}): JSX.Element {
  async function toggleBuiltin(key: string, visible: boolean): Promise<void> {
    const result = await updateFieldVisibility({
      boardId: board.id,
      fieldKey: key,
      visible,
    });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function toggleCustom(
    propertyId: string,
    visible: boolean,
  ): Promise<void> {
    const result = await updateProperty({ propertyId, visible });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Colunas visíveis</h4>
      <p className="text-xs text-text-2">
        Escolha quais propriedades aparecem como colunas na vista Tabela.
      </p>
      <div className="rounded-lg border border-border divide-y divide-border">
        {BUILTIN_FIELDS.map((f) => {
          const visible = board.field_config[f.key]?.visible ?? true;
          return (
            <button
              key={f.key}
              onClick={() => void toggleBuiltin(f.key, !visible)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-surface-2"
            >
              {f.label}
              {visible ? (
                <Eye className="h-3.5 w-3.5 text-text-2" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-text-2" />
              )}
            </button>
          );
        })}
        {board.properties.map((p) => (
          <button
            key={p.id}
            onClick={() => void toggleCustom(p.id, !p.visible)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-surface-2"
          >
            {p.label}
            {p.visible ? (
              <Eye className="h-3.5 w-3.5 text-text-2" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-text-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Aba Ordenar — critérios em cascata (o primeiro manda, os outros só desempatam). */
export function OrdenarTab({
  board,
  onChanged,
}: {
  board: Board;
  onChanged: () => void;
}): JSX.Element {
  const sort = board.view_config.sort;
  const usedFields = sort.map((s) => s.field);
  const availableFields = (
    Object.keys(SORT_FIELD_META) as (keyof typeof SORT_FIELD_META)[]
  ).filter((f) => !usedFields.includes(f));

  async function persist(next: SortRule[]): Promise<void> {
    const result = await updateBoardViewConfig({
      boardId: board.id,
      patch: { sort: next },
    });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  function addRule(): void {
    const field = availableFields[0];
    if (!field) return;
    void persist([
      ...sort,
      { id: crypto.randomUUID(), field, direction: "asc" },
    ]);
  }

  function removeRule(id: string): void {
    void persist(sort.filter((s) => s.id !== id));
  }

  function updateRule(id: string, patch: Partial<SortRule>): void {
    void persist(sort.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function moveRule(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= sort.length) return;
    const next = [...sort];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    void persist(next);
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Ordenação</h4>
      <p className="text-xs text-text-2">
        Adicione critérios de ordenação. Se houver mais de um, o primeiro manda
        — os outros só desempatam.
      </p>
      {sort.length === 0 ? (
        <p className="text-xs text-text-2 py-2">
          Nenhum critério — a ordem segue a criação das tarefas.
        </p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {sort.map((rule, i) => {
            const meta = SORT_FIELD_META[rule.field];
            return (
              <div key={rule.id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => moveRule(i, -1)}
                    disabled={i === 0}
                    className="text-text-2 hover:text-text-1 disabled:opacity-20"
                    aria-label="Mover para cima"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveRule(i, 1)}
                    disabled={i === sort.length - 1}
                    className="text-text-2 hover:text-text-1 disabled:opacity-20"
                    aria-label="Mover para baixo"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <Select
                  value={rule.field}
                  onChange={(e) =>
                    updateRule(rule.id, {
                      field: e.target.value as SortRule["field"],
                    })
                  }
                  className="flex-1"
                >
                  {(
                    Object.keys(
                      SORT_FIELD_META,
                    ) as (keyof typeof SORT_FIELD_META)[]
                  ).map((f) => (
                    <option
                      key={f}
                      value={f}
                      disabled={f !== rule.field && usedFields.includes(f)}
                    >
                      {SORT_FIELD_META[f].label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={rule.direction}
                  onChange={(e) =>
                    updateRule(rule.id, {
                      direction: e.target.value as SortRule["direction"],
                    })
                  }
                  className="w-40 shrink-0"
                >
                  <option value="asc">{meta.ascLabel}</option>
                  <option value="desc">{meta.descLabel}</option>
                </Select>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="shrink-0 text-text-2 hover:text-error"
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="w-full justify-center"
        onClick={addRule}
        disabled={availableFields.length === 0}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Adicionar critério de ordenação
      </Button>
    </div>
  );
}

/** Aba Agrupar — como as colunas do Kanban são organizadas (status, ou outro campo). */
export function AgruparTab({
  board,
  onChanged,
}: {
  board: Board;
  onChanged: () => void;
}): JSX.Element {
  async function select(groupBy: GroupByField): Promise<void> {
    const result = await updateBoardViewConfig({
      boardId: board.id,
      patch: { groupBy },
    });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Agrupar cards por</h4>
      <p className="text-xs text-text-2">
        Escolha como as colunas do Kanban são organizadas.
      </p>
      <div className="flex flex-col gap-1.5">
        {(Object.keys(GROUP_BY_LABELS) as GroupByField[]).map((key) => (
          <button
            key={key}
            onClick={() => void select(key)}
            className={cn(
              "text-left rounded-md border px-3 py-2 text-sm",
              board.view_config.groupBy === key
                ? "border-primary bg-primary/5 text-primary font-medium"
                : "border-border text-text-2 hover:text-text-1",
            )}
          >
            {GROUP_BY_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  );
}

const COLOR_RULE_FIELDS: { key: ColorRule["field"]; label: string }[] = [
  { key: "prioridade", label: "Prioridade" },
  { key: "responsavel", label: "Responsável" },
  { key: "setor", label: "Setor" },
  { key: "status", label: "Status" },
];

function colorRuleValueOptions(
  field: ColorRule["field"],
  board: Board,
): { value: string; label: string }[] {
  if (field === "prioridade")
    return (
      Object.keys(PRIORIDADE_LABELS) as (keyof typeof PRIORIDADE_LABELS)[]
    ).map((p) => ({
      value: p,
      label: PRIORIDADE_LABELS[p],
    }));
  if (field === "setor")
    return Object.keys(SETOR_COLORS).map((s) => ({ value: s, label: s }));
  if (field === "status")
    return board.columns.map((c) => ({ value: c.id, label: c.label }));
  return [];
}

/** Aba Cor — regras "se <campo> = <valor>, colore o card com <cor>" (mesma lógica simples do protótipo). */
export function CorTab({
  board,
  onChanged,
  team,
}: {
  board: Board;
  onChanged: () => void;
  team: { userId: string; fullName: string | null; email: string }[];
}): JSX.Element {
  const rules = board.view_config.colorRules;

  async function persist(next: ColorRule[]): Promise<void> {
    const result = await updateBoardViewConfig({
      boardId: board.id,
      patch: { colorRules: next },
    });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  function addRule(): void {
    void persist([
      ...rules,
      {
        id: crypto.randomUUID(),
        field: "prioridade",
        value: "alta",
        color: COLOR_RULE_SWATCHES[0]!,
      },
    ]);
  }

  function updateRule(id: string, patch: Partial<ColorRule>): void {
    void persist(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRule(id: string): void {
    void persist(rules.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Regras de coloração</h4>
      <p className="text-xs text-text-2">
        Defina cores automáticas por valor de propriedade.
      </p>
      {rules.length === 0 ? (
        <p className="text-xs text-text-2 py-2">
          Nenhuma regra. Adicione para colorir cards automaticamente.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const valueOptions =
              rule.field === "responsavel"
                ? team.map((t) => ({
                    value: t.userId,
                    label: t.fullName ?? t.email,
                  }))
                : colorRuleValueOptions(rule.field, board);
            return (
              <div key={rule.id} className="flex items-center gap-1.5">
                <Select
                  value={rule.field}
                  onChange={(e) =>
                    updateRule(rule.id, {
                      field: e.target.value as ColorRule["field"],
                      value: "",
                    })
                  }
                  className="w-28 shrink-0"
                >
                  {COLOR_RULE_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={rule.value}
                  onChange={(e) =>
                    updateRule(rule.id, { value: e.target.value })
                  }
                  className="flex-1"
                >
                  <option value="">Selecione...</option>
                  {valueOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <div className="flex items-center gap-1 shrink-0">
                  {COLOR_RULE_SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateRule(rule.id, { color: c })}
                      className={cn(
                        "h-5 w-5 rounded-full border-2",
                        rule.color === c
                          ? "border-text-1"
                          : "border-transparent",
                      )}
                      style={{ background: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="shrink-0 text-text-2 hover:text-error"
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="w-full justify-center"
        onClick={addRule}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Adicionar regra
      </Button>
    </div>
  );
}
