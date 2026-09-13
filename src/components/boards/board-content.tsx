"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { MessageSquare, ListChecks, X, Calendar, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  toggleSubtarefa,
  addComentario,
  updateCardCustomValue,
  convertCardToClient,
} from "@/app/actions/boards";
import { listTeamMembers } from "@/app/actions/team";
import {
  PRIORIDADE_LABELS,
  type Board,
  type BoardCard,
  type BoardProperty,
  type CustomValue,
} from "@/types/boards";
import { formatDate, cn, getInitials, isOverdue } from "@/lib/utils";
import { SETOR_COLORS } from "@/lib/constants";
import {
  applyFilters,
  getCardColorOverride,
  groupCards,
  sortCards,
} from "@/lib/board-view";
import { BoardTableView } from "@/components/boards/board-table-view";
import { BoardPanelView } from "@/components/boards/board-panel-view";
import { BoardSettingsPanel } from "@/components/boards/board-settings-panel";
import { BoardFilterBar } from "@/components/boards/board-filter-bar";
import { PropertyField } from "@/components/boards/property-field";

type BoardView = "board" | "table" | "panel";
const VIEW_TABS: { key: BoardView; label: string }[] = [
  { key: "board", label: "Quadro" },
  { key: "table", label: "Tabela" },
  { key: "panel", label: "Painel" },
];

const PRIORIDADE_BADGE_CLASS: Record<string, string> = {
  alta: "bg-error/10 text-error",
  media: "bg-warning/10 text-warning",
  baixa: "bg-surface-2 text-text-2",
};

function DraggableCard({
  card,
  boardCards,
  colorOverride,
  onOpen,
}: {
  card: BoardCard;
  boardCards: BoardCard[];
  colorOverride?: string | null;
  onOpen: (card: BoardCard) => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id });
  const style: CSSProperties = {
    ...(transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : {}),
    ...(colorOverride ? { borderLeft: `3px solid ${colorOverride}` } : {}),
  };

  const doneCount = card.subtarefas.filter((s) => s.done).length;
  const overdue = isOverdue(card.prazo);
  const setorColor = card.setor ? SETOR_COLORS[card.setor] : undefined;
  const blockingCard = card.bloqueada_por
    ? boardCards.find((c) => c.id === card.bloqueada_por)
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(card)}
      className={cardClassName(isDragging)}
    >
      <p className="text-sm font-medium leading-snug">{card.titulo}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
            PRIORIDADE_BADGE_CLASS[card.prioridade],
          )}
        >
          {PRIORIDADE_LABELS[card.prioridade]}
        </span>
        {card.setor && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-surface-2 text-text-2">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: setorColor ?? "var(--text-faint)" }}
            />
            {card.setor}
          </span>
        )}
        {card.related_org_name && (
          <Badge variant="outline">{card.related_org_name}</Badge>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-text-2">
          {card.prazo && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue && "text-error font-medium",
              )}
            >
              <Calendar className="h-3 w-3 opacity-70" />
              {formatDate(card.prazo)}
            </span>
          )}
          {card.subtarefas.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3 w-3 opacity-70" />
              {doneCount}/{card.subtarefas.length}
            </span>
          )}
          {card.comentarios.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3 opacity-70" />
              {card.comentarios.length}
            </span>
          )}
          {blockingCard && (
            <span className="inline-flex items-center gap-1 text-warning">
              <Link2 className="h-3 w-3" />
              {blockingCard.titulo}
            </span>
          )}
        </div>
        {card.responsavel_nome && (
          <span
            className="h-6 w-6 rounded-full bg-primary text-white text-[10px] font-semibold shrink-0 flex items-center justify-center border-2 border-surface-1"
            title={card.responsavel_nome}
          >
            {getInitials(card.responsavel_nome)}
          </span>
        )}
      </div>
    </div>
  );
}

function cardClassName(isDragging: boolean): string {
  return [
    "rounded-lg border border-border bg-surface-1 p-3 space-y-2 cursor-pointer select-none",
    "hover:border-text-2/40 transition-colors",
    isDragging ? "opacity-40" : "",
  ].join(" ");
}

function DroppableColumn({
  columnId,
  children,
}: {
  columnId: string;
  children: ReactNode;
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 min-h-[80px] rounded-lg p-1 transition-colors ${isOver ? "bg-primary/5" : ""}`}
    >
      {children}
    </div>
  );
}

/** Conteúdo de um kanban aberto — abas Quadro/Tabela/Painel, configurações e o card sheet. Não sabe nada sobre a lista de kanbans (isso é do useBoardList/painel lateral do chamador). */
export function BoardContent({
  board,
  onChanged,
  updateBoardOptimistic,
}: {
  board: Board;
  onChanged: () => void;
  updateBoardOptimistic?: (updater: (b: Board) => Board) => void;
}): JSX.Element {
  const [selectedCard, setSelectedCard] = useState<BoardCard | null>(null);
  const [newCardTitles, setNewCardTitles] = useState<Record<string, string>>(
    {},
  );
  const [view, setView] = useState<BoardView>("board");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Coluna nova entra sempre no fim da linha (overflow-x-auto) — sem isso ela
  // fica "invisível" fora da área visível e parece que o botão não fez nada.
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const knownColumnIdsRef = useRef<Set<string>>(
    new Set(board.columns.map((c) => c.id)),
  );
  useEffect(() => {
    const currentIds = board.columns.map((c) => c.id);
    const newIds = currentIds.filter(
      (id) => !knownColumnIdsRef.current.has(id),
    );
    knownColumnIdsRef.current = new Set(currentIds);
    const lastNewId = newIds[newIds.length - 1];
    if (lastNewId) {
      columnRefs.current[lastNewId]?.scrollIntoView({
        behavior: "smooth",
        inline: "end",
        block: "nearest",
      });
    }
  }, [board.columns]);

  const groupBy = board.view_config.groupBy;
  const visibleCards = sortCards(
    applyFilters(board.cards, board.view_config.filters, board),
    board.view_config.sort,
    board,
  );
  const groups = groupCards(visibleCards, groupBy, board);
  const tableAndPanelBoard: Board = { ...board, cards: visibleCards };

  async function handleAddCard(columnId: string): Promise<void> {
    const titulo = (newCardTitles[columnId] ?? "").trim();
    if (!titulo) return;
    setNewCardTitles((prev) => ({ ...prev, [columnId]: "" }));
    const result = await createCard({ boardId: board.id, columnId, titulo });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event;
    if (!over) return;
    const card = board.cards.find((c) => c.id === active.id);
    if (!card) return;
    const groupKey = String(over.id);

    if (groupBy === "status") {
      if (card.column_id === groupKey) return;
      const newPosition = board.cards.filter(
        (c) => c.column_id === groupKey,
      ).length;
      updateBoardOptimistic?.((prev) => ({
        ...prev,
        cards: prev.cards.map((c) =>
          c.id === card.id
            ? { ...c, column_id: groupKey, position: newPosition }
            : c,
        ),
      }));
      const result = await moveCard({
        cardId: card.id,
        columnId: groupKey,
        position: newPosition,
      });
      if (!result.success) toast.error(result.error);
      onChanged();
      return;
    }

    const patch: Record<string, unknown> = {};
    if (groupBy === "prioridade") {
      if (card.prioridade === groupKey) return;
      patch.prioridade = groupKey;
    } else if (groupBy === "responsavel") {
      const current = card.responsavel_id ?? "__none__";
      if (current === groupKey) return;
      patch.responsavelId = groupKey === "__none__" ? null : groupKey;
    } else if (groupBy === "setor") {
      const current = card.setor ?? "__none__";
      if (current === groupKey) return;
      patch.setor = groupKey === "__none__" ? null : groupKey;
    }

    const result = await updateCard({ cardId: card.id, ...patch });
    if (!result.success) toast.error(result.error);
    onChanged();
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span
          className="h-7 w-7 rounded-md flex items-center justify-center text-sm shrink-0"
          style={{ background: board.color }}
        >
          {board.icon}
        </span>
        <h2 className="text-base font-semibold truncate">{board.name}</h2>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              view === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-text-2 hover:text-text-1",
            )}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto pb-2">
          <BoardSettingsPanel board={board} onChanged={onChanged} />
        </div>
      </div>

      <div className="mb-4">
        <BoardFilterBar board={board} onChanged={onChanged} />
      </div>

      {view === "table" && (
        <BoardTableView
          board={tableAndPanelBoard}
          onOpenCard={setSelectedCard}
        />
      )}
      {view === "panel" && <BoardPanelView board={tableAndPanelBoard} />}

      {view === "board" && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {groups.map((group) => (
              <div
                key={group.key}
                ref={(el) => {
                  columnRefs.current[group.key] = el;
                }}
                className="w-72 shrink-0"
              >
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: group.color }}
                  />
                  <span className="text-sm font-semibold">{group.label}</span>
                  <span className="text-xs text-text-2">
                    {group.cards.length}
                  </span>
                </div>
                <DroppableColumn columnId={group.key}>
                  {group.cards.map((card) => (
                    <DraggableCard
                      key={card.id}
                      card={card}
                      boardCards={board.cards}
                      colorOverride={getCardColorOverride(
                        card,
                        board.view_config.colorRules,
                      )}
                      onOpen={setSelectedCard}
                    />
                  ))}
                </DroppableColumn>
                {groupBy === "status" && (
                  <div className="mt-2 flex gap-1.5">
                    <Input
                      placeholder="+ Adicionar card"
                      className="h-8 text-sm"
                      value={newCardTitles[group.key] ?? ""}
                      onChange={(e) =>
                        setNewCardTitles((prev) => ({
                          ...prev,
                          [group.key]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleAddCard(group.key);
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </DndContext>
      )}

      <Sheet
        open={!!selectedCard}
        onOpenChange={(open) => !open && setSelectedCard(null)}
      >
        <SheetContent className="overflow-y-auto">
          {selectedCard && (
            <CardDetail
              card={selectedCard}
              properties={board.properties}
              module={board.module}
              onChanged={onChanged}
              onClose={() => setSelectedCard(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CardDetail({
  card,
  properties,
  module,
  onChanged,
  onClose,
}: {
  card: BoardCard;
  properties: BoardProperty[];
  module: Board["module"];
  onChanged: () => void;
  onClose: () => void;
}): JSX.Element {
  const [titulo, setTitulo] = useState(card.titulo);
  const [prioridade, setPrioridade] = useState(card.prioridade);
  const [responsavelId, setResponsavelId] = useState(card.responsavel_id ?? "");
  const [setor, setSetor] = useState(card.setor ?? "");
  const [prazo, setPrazo] = useState(card.prazo ?? "");
  const [observacoes, setObservacoes] = useState(card.observacoes ?? "");
  const [novaSubtarefa, setNovaSubtarefa] = useState("");
  const [novoComentario, setNovoComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState<
    { userId: string; fullName: string | null; email: string }[]
  >([]);
  const [convertEmail, setConvertEmail] = useState("");
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    void listTeamMembers().then((result) => {
      if (result.success)
        setTeam(
          result.data.map((t) => ({
            userId: t.userId,
            fullName: t.fullName,
            email: t.email,
          })),
        );
    });
  }, []);

  async function save(patch: Record<string, unknown>): Promise<void> {
    setSaving(true);
    const result = await updateCard({ cardId: card.id, ...patch });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  async function saveCustom(
    propertyKey: string,
    value: CustomValue,
  ): Promise<void> {
    const result = await updateCardCustomValue({
      cardId: card.id,
      propertyKey,
      value,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  async function handleToggleSub(id: string): Promise<void> {
    const result = await toggleSubtarefa({ cardId: card.id, subtarefaId: id });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleRemoveSub(id: string): Promise<void> {
    const result = await toggleSubtarefa({ cardId: card.id, removeId: id });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleAddSub(): Promise<void> {
    const texto = novaSubtarefa.trim();
    if (!texto) return;
    setNovaSubtarefa("");
    const result = await toggleSubtarefa({ cardId: card.id, texto });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleAddComentario(): Promise<void> {
    const texto = novoComentario.trim();
    if (!texto) return;
    setNovoComentario("");
    const result = await addComentario({ cardId: card.id, texto });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleConvert(): Promise<void> {
    const ownerEmail = convertEmail.trim();
    if (!ownerEmail) return;
    setConverting(true);
    const result = await convertCardToClient({ cardId: card.id, ownerEmail });
    setConverting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Cliente criado e vinculado ao card.");
    onChanged();
  }

  async function handleDeleteCard(): Promise<void> {
    const result = await deleteCard(card.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onChanged();
    onClose();
  }

  return (
    <div className="space-y-6">
      <SheetHeader className="p-0">
        <SheetTitle>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => titulo !== card.titulo && void save({ titulo })}
            className="text-base font-semibold"
          />
        </SheetTitle>
      </SheetHeader>

      {module === "crm" && (
        <div className="rounded-lg border border-border bg-surface-1 p-3 space-y-2">
          {card.related_org_id ? (
            <p className="text-sm text-success flex items-center gap-1.5">
              ✅ Convertido em cliente
              {card.related_org_name ? `: ${card.related_org_name}` : ""}
            </p>
          ) : (
            <>
              <p className="text-xs text-text-2 font-medium">
                Converter em cliente
              </p>
              <div className="flex gap-1.5">
                <Input
                  type="email"
                  placeholder="Email do responsável"
                  className="h-8 text-sm"
                  value={convertEmail}
                  onChange={(e) => setConvertEmail(e.target.value)}
                  disabled={converting}
                />
                <Button
                  size="sm"
                  onClick={() => void handleConvert()}
                  disabled={converting || !convertEmail.trim()}
                >
                  {converting ? "Criando..." : "Converter"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-xs text-text-2">Prioridade</p>
          <Select
            value={prioridade}
            onChange={(e) => {
              const v = e.target.value as typeof prioridade;
              setPrioridade(v);
              void save({ prioridade: v });
            }}
            disabled={saving}
          >
            {(
              Object.keys(
                PRIORIDADE_LABELS,
              ) as (keyof typeof PRIORIDADE_LABELS)[]
            ).map((p) => (
              <option key={p} value={p}>
                {PRIORIDADE_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-text-2">Prazo</p>
          <Input
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            onBlur={() => void save({ prazo })}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-text-2">Responsável</p>
          <Select
            value={responsavelId}
            onChange={(e) => {
              const v = e.target.value;
              setResponsavelId(v);
              void save({ responsavelId: v || null });
            }}
            disabled={saving}
          >
            <option value="">Nenhum</option>
            {team.map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.fullName ?? t.email}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-text-2">Setor</p>
        <Input
          value={setor}
          onChange={(e) => setSetor(e.target.value)}
          onBlur={() => void save({ setor })}
          placeholder="Ex: Estratégico, Financeiro..."
          disabled={saving}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-text-2">Observações</p>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          onBlur={() => void save({ observacoes })}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={saving}
        />
      </div>

      {properties.filter((p) => p.visible).length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-text-2 font-medium">Propriedades</p>
          {properties
            .filter((p) => p.visible)
            .map((prop) => (
              <div key={prop.id} className="space-y-1.5">
                <p className="text-xs text-text-2">{prop.label}</p>
                <PropertyField
                  property={prop}
                  value={card.custom_values[prop.key] ?? null}
                  onSave={(value) => void saveCustom(prop.key, value)}
                />
              </div>
            ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-text-2 font-medium">
          Sub-tarefas ({card.subtarefas.filter((s) => s.done).length}/
          {card.subtarefas.length})
        </p>
        {card.subtarefas.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.done}
              onChange={() => void handleToggleSub(s.id)}
              className="h-4 w-4"
            />
            <span
              className={s.done ? "line-through text-text-2 flex-1" : "flex-1"}
            >
              {s.texto}
            </span>
            <button
              onClick={() => void handleRemoveSub(s.id)}
              aria-label="Remover"
            >
              <X className="h-3.5 w-3.5 text-text-2 hover:text-error" />
            </button>
          </div>
        ))}
        <div className="flex gap-1.5">
          <Input
            placeholder="+ Sub-tarefa"
            className="h-8 text-sm"
            value={novaSubtarefa}
            onChange={(e) => setNovaSubtarefa(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleAddSub()}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-text-2 font-medium">
          Comentários ({card.comentarios.length})
        </p>
        {card.comentarios.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-border bg-surface-1 p-2.5 text-sm"
          >
            <p className="text-xs font-medium text-text-2">
              {c.autor_nome} · {formatDate(c.created_at)}
            </p>
            <p>{c.texto}</p>
          </div>
        ))}
        <div className="flex gap-1.5">
          <Input
            placeholder="Escrever um comentário..."
            className="h-8 text-sm"
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleAddComentario()}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Fechar
        </Button>
        <button
          onClick={() => void handleDeleteCard()}
          className="text-sm text-error hover:underline"
        >
          Excluir card
        </button>
      </div>
    </div>
  );
}
