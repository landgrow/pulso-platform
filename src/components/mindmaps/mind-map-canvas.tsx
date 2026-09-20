"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type CSSProperties,
} from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  X,
  Share2,
  LayoutTemplate,
  Sparkles,
} from "lucide-react";
import { ListSecondaryPanel } from "@/components/layout/list-secondary-panel";
import { InlineText } from "@/components/layout/inline-text";
import { MapViewport } from "@/components/mindmaps/map-viewport";
import { RadialTree } from "@/components/mindmaps/radial-tree";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  listMindMaps,
  getMindMap,
  createMindMap,
  saveMindMapTree,
  deleteMindMap,
} from "@/app/actions/mindmaps";
import { generateMindMapFromText } from "@/app/actions/mindmap-ai";
import {
  isLegacyBlankColumnMap,
  shouldUseRadialTree,
  upgradeLegacyBlankToRadial,
} from "@/lib/mindmap-templates";
import {
  MIND_MAP_TEMPLATES,
  type MindMapLayout,
  type MindMapNode,
  type MindMapSummary,
} from "@/types/mindmaps";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
];

function findNode(root: MindMapNode, id: string): MindMapNode | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

function mutateTree(
  root: MindMapNode,
  id: string,
  mutate: (n: MindMapNode) => void,
): MindMapNode {
  const clone: MindMapNode = JSON.parse(JSON.stringify(root));
  const target = findNode(clone, id);
  if (target) mutate(target);
  return clone;
}

function removeNode(root: MindMapNode, id: string): MindMapNode {
  const clone: MindMapNode = JSON.parse(JSON.stringify(root));
  function strip(node: MindMapNode): void {
    node.children = node.children.filter((c) => c.id !== id);
    node.children.forEach(strip);
  }
  strip(clone);
  return clone;
}

/** Uma coluna/quadrante/bloco — mesmo miolo (título + lista de itens) nos 3 layouts estruturados do protótipo, só muda a borda e o wrapper externo. */
function LayoutBox({
  node,
  layout,
  editable,
  onRenameTitle,
  onDeleteBox,
  onRenameItem,
  onDeleteItem,
  onAddItem,
}: {
  node: MindMapNode;
  layout: MindMapLayout;
  editable: boolean;
  onRenameTitle: (text: string) => void;
  onDeleteBox: () => void;
  onRenameItem: (itemId: string, text: string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: () => void;
}): JSX.Element {
  const style: CSSProperties =
    layout === "quadrant"
      ? { border: `2px solid ${node.color}` }
      : layout === "canvas-grid"
        ? { borderLeft: `4px solid ${node.color}` }
        : { borderTop: `4px solid ${node.color}` };

  return (
    <div
      className={cn(
        "group/box bg-surface-1 flex flex-col gap-2 shadow-sm",
        layout === "quadrant"
          ? "rounded-2xl p-4 min-h-[160px]"
          : "rounded-xl p-3.5",
      )}
      style={style}
    >
      <div className="flex items-center gap-2">
        <InlineText
          value={node.text}
          onCommit={onRenameTitle}
          className={cn("flex-1 text-sm font-semibold min-w-0")}
          inputClassName="h-7 flex-1 text-sm font-semibold"
        />
        {editable && (
          <button
            onClick={onDeleteBox}
            className="shrink-0 text-text-2 hover:text-error opacity-0 group-hover/box:opacity-100"
            aria-label="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-1">
        {node.children.map((item) => (
          <div
            key={item.id}
            className="group/item flex items-center gap-1.5 rounded-md bg-surface-2/60 px-2 py-1.5 text-sm"
          >
            <InlineText
              value={item.text}
              onCommit={(text) => onRenameItem(item.id, text)}
              className="flex-1 min-w-0"
              inputClassName="h-7 flex-1 text-sm"
            />
            <button
              onClick={() => onDeleteItem(item.id)}
              className="shrink-0 text-text-2 hover:text-error opacity-0 group-hover/item:opacity-100"
              aria-label="Excluir item"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={onAddItem}
          className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-text-2 hover:text-text-1 hover:border-text-2"
        >
          <Plus className="h-3 w-3" />
          Adicionar
        </button>
      </div>
    </div>
  );
}

export function MindMapCanvas({ orgId }: { orgId: string }): JSX.Element {
  const [maps, setMaps] = useState<MindMapSummary[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [tree, setTree] = useState<MindMapNode | null>(null);
  const [layout, setLayout] = useState<MindMapLayout>("radial");
  const [loading, setLoading] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const hydrateMap = useCallback(
    async (
      mindMapId: string,
      tree: MindMapNode,
      layout: MindMapLayout,
    ): Promise<void> => {
      if (isLegacyBlankColumnMap(layout, tree)) {
        const next = upgradeLegacyBlankToRadial(tree);
        setTree(next);
        setLayout("radial");
        const saved = await saveMindMapTree({
          mindMapId,
          tree: next,
          layout: "radial",
        });
        if (!saved.success) toast.error(saved.error);
        return;
      }
      if (layout === "columns" && shouldUseRadialTree(layout, tree)) {
        setTree(tree);
        setLayout("radial");
        const saved = await saveMindMapTree({
          mindMapId,
          tree,
          layout: "radial",
        });
        if (!saved.success) toast.error(saved.error);
        return;
      }
      setTree(tree);
      setLayout(layout);
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const summaryResult = await listMindMaps(orgId);
    if (!summaryResult.success) {
      toast.error(summaryResult.error);
      setLoading(false);
      return;
    }
    let list = summaryResult.data;
    if (list.length === 0) {
      const created = await createMindMap({ orgId, name: "Novo Projeto" });
      if (!created.success) {
        toast.error(created.error);
        setLoading(false);
        return;
      }
      const refreshed = await listMindMaps(orgId);
      list = refreshed.success ? refreshed.data : [];
    }
    setMaps(list);
    const targetId = list[0]?.id ?? null;
    setActiveMapId(targetId);
    if (targetId) {
      const mapResult = await getMindMap(targetId);
      if (mapResult.success) {
        await hydrateMap(targetId, mapResult.data.tree, mapResult.data.layout);
      }
    }
    setLoading(false);
  }, [orgId, hydrateMap]);

  // Guarda de montagem: em dev, o React (StrictMode) monta o efeito 2x de
  // propósito pra achar bugs de efeito colateral — sem essa trava, as duas
  // chamadas concorrentes de load() achariam a lista vazia ao mesmo tempo e
  // criariam 2 mapas "Meu mapa" duplicados.
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function openMap(id: string): Promise<void> {
    setActiveMapId(id);
    setLoading(true);
    const result = await getMindMap(id);
    if (result.success) {
      await hydrateMap(id, result.data.tree, result.data.layout);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  async function persist(next: MindMapNode): Promise<void> {
    setTree(next);
    if (!activeMapId) return;
    const result = await saveMindMapTree({
      mindMapId: activeMapId,
      tree: next,
    });
    if (!result.success) toast.error(result.error);
  }

  async function handleApplyTemplate(templateKey: string): Promise<void> {
    const result = await createMindMap({ orgId, templateKey });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setTemplatesOpen(false);
    const listResult = await listMindMaps(orgId);
    if (listResult.success) setMaps(listResult.data);
    await openMap(result.data.id);
  }

  async function handleGenerateWithAi(text: string): Promise<boolean> {
    const result = await generateMindMapFromText({ orgId, text });
    if (!result.success) {
      toast.error(result.error);
      return false;
    }
    setAiOpen(false);
    const listResult = await listMindMaps(orgId);
    if (listResult.success) setMaps(listResult.data);
    await openMap(result.data.id);
    return true;
  }

  async function handleDeleteMap(id: string): Promise<void> {
    if (maps.length <= 1) {
      toast.error("Precisa manter pelo menos um mapa.");
      return;
    }
    const result = await deleteMindMap(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const listResult = await listMindMaps(orgId);
    const list = listResult.success ? listResult.data : [];
    setMaps(list);
    const nextId = list[0]?.id ?? null;
    if (nextId) {
      await openMap(nextId);
    } else {
      setActiveMapId(null);
      setTree(null);
    }
  }

  function handleRenameMap(text: string): void {
    if (!tree) return;
    void persist({ ...tree, text });
  }

  function handleAddBox(): void {
    if (!tree) return;
    const color =
      PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? "#3b82f6";
    void persist({
      ...tree,
      children: [
        ...tree.children,
        { id: crypto.randomUUID(), text: "Nova coluna", color, children: [] },
      ],
    });
  }

  function handleRenameBox(boxId: string, text: string): void {
    if (!tree) return;
    void persist(
      mutateTree(tree, boxId, (n) => {
        n.text = text;
      }),
    );
  }

  function handleDeleteBox(boxId: string): void {
    if (!tree) return;
    void persist(removeNode(tree, boxId));
  }

  function handleAddItem(boxId: string): void {
    if (!tree) return;
    const next = mutateTree(tree, boxId, (n) => {
      n.children.push({
        id: crypto.randomUUID(),
        text: "Novo item",
        color: n.color,
        children: [],
      });
    });
    void persist(next);
  }

  function handleRenameItem(itemId: string, text: string): void {
    if (!tree) return;
    void persist(
      mutateTree(tree, itemId, (n) => {
        n.text = text;
      }),
    );
  }

  function handleDeleteItem(itemId: string): void {
    if (!tree) return;
    void persist(removeNode(tree, itemId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-2">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando mapa...
      </div>
    );
  }

  const useRadial = tree ? shouldUseRadialTree(layout, tree) : true;
  const boxesEditable = layout !== "quadrant";
  const mapTools = (
    <>
      {useRadial ? (
        <span className="mr-1 text-sm font-bold tracking-tight text-text-1">
          Mapa
        </span>
      ) : (
        tree && (
          <InlineText
            value={tree.text}
            onCommit={handleRenameMap}
            className="text-sm font-bold text-text-1"
            inputClassName="h-8 w-auto max-w-md text-sm font-bold"
          />
        )
      )}
      <button
        type="button"
        onClick={() => setTemplatesOpen(true)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-2 hover:bg-surface-2 hover:text-text-1"
      >
        <LayoutTemplate className="h-3.5 w-3.5" />
        Templates
      </button>
      <button
        type="button"
        onClick={() => setAiOpen(true)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Gerar com IA
      </button>
    </>
  );

  return (
    <div className="flex h-full min-h-0 items-stretch overflow-hidden">
      <ListSecondaryPanel
        sectionLabel="Mapas"
        items={maps.map((m) => ({ id: m.id, name: m.name }))}
        activeId={activeMapId}
        icon={<Share2 className="h-4 w-4" />}
        createLabel="Novo mapa"
        className="rounded-none border-y-0 border-l-0"
        onSelect={(id) => void openMap(id)}
        onCreate={() => setTemplatesOpen(true)}
        onDelete={(id) => void handleDeleteMap(id)}
      />

      {tree && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {useRadial && (
            <MapViewport key={activeMapId} fill toolbarLeft={mapTools}>
              <RadialTree tree={tree} onChange={(next) => void persist(next)} />
            </MapViewport>
          )}

          {layout === "columns" && !useRadial && (
            <MapViewport key={activeMapId} fill toolbarLeft={mapTools}>
              <div className="flex gap-4 items-start pb-2">
                {tree.children.map((box) => (
                  <div key={box.id} className="w-64 shrink-0">
                    <LayoutBox
                      node={box}
                      layout={layout}
                      editable={boxesEditable}
                      onRenameTitle={(text) => handleRenameBox(box.id, text)}
                      onDeleteBox={() => handleDeleteBox(box.id)}
                      onRenameItem={handleRenameItem}
                      onDeleteItem={handleDeleteItem}
                      onAddItem={() => handleAddItem(box.id)}
                    />
                  </div>
                ))}
                <button
                  onClick={handleAddBox}
                  className="h-11 w-64 shrink-0 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm text-text-2 hover:text-text-1 hover:border-text-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova coluna
                </button>
              </div>
            </MapViewport>
          )}

          {layout === "quadrant" && (
            <MapViewport key={activeMapId} fill toolbarLeft={mapTools}>
              <div className="grid grid-cols-2 gap-4 w-[48rem]">
                {tree.children.map((box) => (
                  <LayoutBox
                    key={box.id}
                    node={box}
                    layout={layout}
                    editable={boxesEditable}
                    onRenameTitle={(text) => handleRenameBox(box.id, text)}
                    onDeleteBox={() => handleDeleteBox(box.id)}
                    onRenameItem={handleRenameItem}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={() => handleAddItem(box.id)}
                  />
                ))}
              </div>
            </MapViewport>
          )}

          {layout === "canvas-grid" && (
            <MapViewport key={activeMapId} fill toolbarLeft={mapTools}>
              <div
                className="grid gap-3.5 w-[64rem]"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                }}
              >
                {tree.children.map((box) => (
                  <LayoutBox
                    key={box.id}
                    node={box}
                    layout={layout}
                    editable={boxesEditable}
                    onRenameTitle={(text) => handleRenameBox(box.id, text)}
                    onDeleteBox={() => handleDeleteBox(box.id)}
                    onRenameItem={handleRenameItem}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={() => handleAddItem(box.id)}
                  />
                ))}
                <button
                  onClick={handleAddBox}
                  className="h-11 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm text-text-2 hover:text-text-1 hover:border-text-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo bloco
                </button>
              </div>
            </MapViewport>
          )}
        </div>
      )}

      <Sheet open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <SheetContent side="center" className="overflow-y-auto p-6">
          <SheetHeader className="p-0">
            <SheetTitle>Escolha um template</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2.5">
            {MIND_MAP_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => void handleApplyTemplate(t.key)}
                className="text-left rounded-lg border border-border p-3 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="text-xl mb-1">{t.icon}</div>
                <div className="text-sm font-semibold mb-0.5">{t.title}</div>
                <div className="text-xs text-text-2 leading-snug">{t.desc}</div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <AiGenerateSheet
        open={aiOpen}
        onOpenChange={setAiOpen}
        onGenerate={handleGenerateWithAi}
      />
    </div>
  );
}

function AiGenerateSheet({
  open,
  onOpenChange,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (text: string) => Promise<boolean>;
}): JSX.Element {
  const [text, setText] = useState("");
  const [generating, setGenerating] = useState(false);

  async function handleClick(): Promise<void> {
    if (!text.trim()) return;
    setGenerating(true);
    const success = await onGenerate(text.trim());
    setGenerating(false);
    if (success) setText("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="center" className="overflow-y-auto p-6">
        <SheetHeader className="p-0">
          <SheetTitle>✨ Gerar mapa a partir de um texto</SheetTitle>
        </SheetHeader>
        <div className="space-y-1.5">
          <p className="text-xs text-text-2">
            Cole notas, uma transcrição ou qualquer texto — a IA organiza em
            ramos, colunas ou quadrantes automaticamente.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Ex: notas de uma reunião de planejamento, um brainstorm, um resumo de estratégia..."
            disabled={generating}
          />
        </div>
        <SheetFooter className="p-0 mt-auto">
          <Button
            onClick={() => void handleClick()}
            disabled={generating || !text.trim()}
          >
            {generating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Gerar mapa
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
