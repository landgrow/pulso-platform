"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createDriveFolder,
  createDriveUploadUrl,
  deleteDriveItem,
  getDriveFileUrl,
  listDriveFolder,
  renameDriveItem,
  type DriveItem,
} from "@/app/actions/documentos-drive";
import { createClient } from "@/lib/supabase/client";
import { useQueryParams } from "@/hooks/use-query-params";
import { parseFolder } from "@/lib/documentos/storage-names";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn, formatDate } from "@/lib/utils";

const BUCKET = "evidencias";

type Upload = {
  id: string;
  name: string;
  status: "sending" | "done" | "error";
  error?: string;
};

type NameDialog =
  { mode: "folder" } | { mode: "rename"; item: DriveItem } | null;

function formatBytes(n: number | null): string {
  if (n === null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function FileIcon({ item }: { item: DriveItem }): JSX.Element {
  if (item.kind === "folder") {
    return <Folder className="h-5 w-5 shrink-0 text-primary" aria-hidden />;
  }
  const ext = item.name.split(".").pop()?.toLowerCase() ?? "";
  const cls = "h-5 w-5 shrink-0 text-text-2";
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) {
    return <FileSpreadsheet className={cn(cls, "text-success")} aria-hidden />;
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) {
    return <FileImage className={cls} aria-hidden />;
  }
  if (["zip", "rar", "7z"].includes(ext)) {
    return <FileArchive className={cls} aria-hidden />;
  }
  if (["pdf", "doc", "docx", "txt", "ppt", "pptx", "odt"].includes(ext)) {
    return <FileText className={cn(cls, ext === "pdf" && "text-error")} />;
  }
  return <File className={cls} aria-hidden />;
}

/**
 * Drive de Documentos: o cliente sobe arquivos do negócio para a Land Grow
 * analisar. Mesmo componente no portal do cliente e na ficha do cliente no HQ.
 */
export function DocumentsDrive({ orgId }: { orgId: string }): JSX.Element {
  // A pasta aberta fica na URL: "Voltar" sobe de pasta e voltar de outra
  // página reabre a mesma pasta.
  const urlState = useQueryParams();
  const pastaParam = urlState.get("pasta") ?? "";
  const folderValid = parseFolder(pastaParam) !== null;
  function setPath(next: string[]): void {
    urlState.update({ pasta: next.join("/") });
  }
  const [items, setItems] = useState<DriveItem[] | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [nameDialog, setNameDialog] = useState<NameDialog>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmNode, confirm] = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const folder = folderValid ? pastaParam : "";
  const path = folder ? folder.split("/") : [];

  function showListing(
    result: Awaited<ReturnType<typeof listDriveFolder>>,
  ): void {
    if (!result.success) {
      setLoadError(result.error);
      setItems([]);
      return;
    }
    setLoadError(null);
    setItems(result.data.items);
    setCanWrite(result.data.canWrite);
  }

  async function load(): Promise<void> {
    showListing(await listDriveFolder({ orgId, folder }));
  }

  // Troca de pasta (inclusive pelo "Voltar" do navegador): recarrega a lista.
  useEffect(() => {
    let cancelled = false;
    setItems(null); // eslint-disable-line react-hooks/set-state-in-effect
    void listDriveFolder({ orgId, folder }).then((result) => {
      if (!cancelled) showListing(result);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, folder]);

  async function uploadFiles(files: FileList | File[]): Promise<void> {
    const list = Array.from(files);
    if (list.length === 0) return;
    const supabase = createClient();
    const batch = list.map((file) => ({
      file,
      id: crypto.randomUUID(),
    }));
    setUploads((prev) => [
      ...batch.map(({ file, id }): Upload => ({
        id,
        name: file.name,
        status: "sending",
      })),
      ...prev,
    ]);
    const mark = (id: string, patch: Partial<Upload>): void =>
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      );

    // Um por vez: o nome final ("x (2).pdf") depende do que já subiu.
    for (const { file, id } of batch) {
      const prepared = await createDriveUploadUrl({
        orgId,
        folder,
        fileName: file.name,
        size: file.size,
      });
      if (!prepared.success) {
        mark(id, { status: "error", error: prepared.error });
        continue;
      }
      const { error } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(prepared.data.path, prepared.data.token, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (error) {
        // O Storage recusa arquivo acima do limite do plano com 413 / "exceeded".
        const status = (error as { statusCode?: string | number }).statusCode;
        const tooBig =
          String(status) === "413" ||
          /exceed|maximum allowed size|too large/i.test(error.message);
        mark(id, {
          status: "error",
          error: tooBig
            ? "Acima do limite de tamanho do armazenamento. Fale com a Land Grow."
            : "Falha no envio. Tente de novo.",
        });
        continue;
      }
      mark(id, { status: "done", name: prepared.data.name });
    }
    await load();
  }

  async function openFile(item: DriveItem): Promise<void> {
    setBusy(item.name);
    const result = await getDriveFileUrl({ orgId, folder, name: item.name });
    setBusy(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  async function removeItem(item: DriveItem): Promise<void> {
    const ok = await confirm({
      title:
        item.kind === "folder"
          ? `Excluir a pasta "${item.name}"?`
          : `Excluir "${item.name}"?`,
      description:
        item.kind === "folder"
          ? "A pasta e tudo o que está dentro dela somem para todo mundo. Não dá para desfazer."
          : "O arquivo some para todo mundo. Não dá para desfazer.",
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    setBusy(item.name);
    const result = await deleteDriveItem({
      orgId,
      folder,
      name: item.name,
      kind: item.kind,
    });
    setBusy(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      item.kind === "folder" ? "Pasta excluída" : "Arquivo excluído",
    );
    await load();
  }

  async function submitName(name: string): Promise<string | null> {
    if (!nameDialog) return null;
    const result =
      nameDialog.mode === "folder"
        ? await createDriveFolder({ orgId, folder, name })
        : await renameDriveItem({
            orgId,
            folder,
            name: nameDialog.item.name,
            kind: nameDialog.item.kind,
            newName: name,
          });
    if (!result.success) return result.error;
    setNameDialog(null);
    await load();
    return null;
  }

  function onDragEnter(e: DragEvent): void {
    if (!canWrite || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }
  function onDragLeave(): void {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }
  function onDrop(e: DragEvent): void {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (canWrite) void uploadFiles(e.dataTransfer.files);
  }

  const q = query.trim().toLocaleLowerCase("pt-BR");
  const visible = (items ?? []).filter(
    (i) => !q || i.name.toLocaleLowerCase("pt-BR").includes(q),
  );
  const sending = uploads.some((u) => u.status === "sending");

  return (
    <div
      className="relative space-y-4"
      onDragEnter={onDragEnter}
      onDragOver={(e) => canWrite && e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {confirmNode}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <nav
          aria-label="Pastas"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm"
        >
          <button
            type="button"
            onClick={() => setPath([])}
            className={cn(
              "rounded px-1.5 py-0.5 hover:bg-surface-2",
              path.length === 0
                ? "font-semibold text-text-1"
                : "text-text-2 hover:text-text-1",
            )}
          >
            Meus documentos
          </button>
          {path.map((segment, i) => (
            <span key={`${i}-${segment}`} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-text-3" aria-hidden />
              <button
                type="button"
                onClick={() => setPath(path.slice(0, i + 1))}
                className={cn(
                  "max-w-[14rem] truncate rounded px-1.5 py-0.5 hover:bg-surface-2",
                  i === path.length - 1
                    ? "font-semibold text-text-1"
                    : "text-text-2 hover:text-text-1",
                )}
              >
                {segment}
              </button>
            </span>
          ))}
        </nav>
        <div className="relative w-full sm:w-56">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nesta pasta"
            className="h-9 pl-8 text-sm"
          />
        </div>
        {canWrite ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNameDialog({ mode: "folder" })}
            >
              <FolderPlus className="mr-1.5 h-4 w-4" />
              Nova pasta
            </Button>
            <Button
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}
              Enviar arquivos
            </Button>
          </>
        ) : null}
      </div>

      {uploads.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface-1">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-text-2">
              {sending
                ? "Enviando…"
                : `${uploads.filter((u) => u.status === "done").length} de ${uploads.length} enviados`}
            </span>
            {!sending ? (
              <button
                type="button"
                onClick={() => setUploads([])}
                className="rounded p-1 text-text-3 hover:bg-surface-2 hover:text-text-1"
                aria-label="Fechar lista de envios"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <ul className="max-h-48 divide-y divide-border overflow-y-auto">
            {uploads.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                {u.status === "sending" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                ) : u.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-error" />
                )}
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
                {u.error ? (
                  <span className="shrink-0 text-xs text-error">{u.error}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {items === null ? (
        <div className="flex items-center justify-center py-16 text-sm text-text-2">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando documentos…
        </div>
      ) : loadError ? (
        <p className="py-8 text-center text-sm text-error">{loadError}</p>
      ) : items.length === 0 ? (
        canWrite ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed border-border px-4 py-14 text-center transition-colors hover:border-primary hover:bg-surface-1"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2">
              <Upload className="h-5 w-5 text-text-2" />
            </span>
            <span className="text-sm font-semibold text-text-1">
              {path.length === 0
                ? "Arraste arquivos aqui"
                : "Esta pasta está vazia. Arraste arquivos aqui"}
            </span>
            <span className="text-xs text-text-3">
              ou clique para selecionar. Contratos, planilhas, extratos,
              relatórios. Até 200 MB por arquivo.
            </span>
          </button>
        ) : (
          <p className="py-12 text-center text-sm text-text-2">
            Nenhum documento nesta pasta.
          </p>
        )
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-1 text-left text-xs text-text-2">
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  Modificado
                </th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                  Tamanho
                </th>
                <th className="w-10 px-2 py-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((item) => (
                <tr
                  key={`${item.kind}:${item.name}`}
                  className="group hover:bg-surface-1"
                >
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        item.kind === "folder"
                          ? setPath([...path, item.name])
                          : void openFile(item)
                      }
                      className="flex w-full min-w-0 items-center gap-2.5 py-1 text-left"
                    >
                      {busy === item.name ? (
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-text-2" />
                      ) : (
                        <FileIcon item={item} />
                      )}
                      <span className="truncate font-medium text-text-1">
                        {item.name}
                      </span>
                    </button>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-1.5 text-text-2 sm:table-cell">
                    {item.updatedAt ? formatDate(item.updatedAt) : "—"}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-text-2 sm:table-cell">
                    {item.kind === "folder" ? "—" : formatBytes(item.size)}
                  </td>
                  <td className="px-2 py-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded p-1 text-text-2 hover:bg-surface-2 hover:text-text-1"
                          aria-label={`Ações de ${item.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        // Senão o menu devolve o foco ao botão e rouba o do
                        // campo de "Renomear".
                        onCloseAutoFocus={(e) => e.preventDefault()}
                      >
                        {item.kind === "file" ? (
                          <DropdownMenuItem
                            onSelect={() => void openFile(item)}
                          >
                            <Download /> Baixar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() => setPath([...path, item.name])}
                          >
                            <Folder /> Abrir
                          </DropdownMenuItem>
                        )}
                        {canWrite ? (
                          <>
                            <DropdownMenuItem
                              onSelect={() =>
                                setNameDialog({ mode: "rename", item })
                              }
                            >
                              <Pencil /> Renomear
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => void removeItem(item)}
                              className="text-error focus:text-error"
                            >
                              <Trash2 /> Excluir
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-sm text-text-2"
                  >
                    Nada com “{query.trim()}” nesta pasta.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/85">
          <div className="flex flex-col items-center gap-2 text-sm font-semibold text-primary">
            <Upload className="h-6 w-6" />
            Solte para enviar
            {path.length > 0 ? ` para “${path[path.length - 1]}”` : ""}
          </div>
        </div>
      ) : null}

      <NameDialogView
        dialog={nameDialog}
        onClose={() => setNameDialog(null)}
        onSubmit={submitName}
      />
    </div>
  );
}

function NameDialogView({
  dialog,
  onClose,
  onSubmit,
}: {
  dialog: NameDialog;
  onClose: () => void;
  onSubmit: (name: string) => Promise<string | null>;
}): JSX.Element {
  return (
    <Dialog open={dialog !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md"
        // Foca o campo e, no arquivo, seleciona só o nome (sem a extensão),
        // como no Drive/Finder — o padrão do Radix selecionaria tudo.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const input = (e.currentTarget as HTMLElement | null)?.querySelector(
            "input",
          );
          if (!input) return;
          input.focus();
          const dot = input.value.lastIndexOf(".");
          if (
            dialog?.mode === "rename" &&
            dialog.item.kind === "file" &&
            dot > 0
          ) {
            input.setSelectionRange(0, dot);
          } else {
            input.select();
          }
        }}
      >
        {dialog ? (
          <NameForm
            key={dialog.mode === "rename" ? dialog.item.name : "folder"}
            dialog={dialog}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  dialog,
  onClose,
  onSubmit,
}: {
  dialog: Exclude<NameDialog, null>;
  onClose: () => void;
  onSubmit: (name: string) => Promise<string | null>;
}): JSX.Element {
  const initial = dialog.mode === "rename" ? dialog.item.name : "";
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    const err = await onSubmit(value);
    setSaving(false);
    setError(err);
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {dialog.mode === "folder" ? "Nova pasta" : "Renomear"}
        </DialogTitle>
        <DialogDescription>
          {dialog.mode === "folder"
            ? "Organize os arquivos por assunto: Financeiro, Contratos, Comercial…"
            : `Novo nome para “${dialog.item.name}”.`}
        </DialogDescription>
      </DialogHeader>
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        placeholder={dialog.mode === "folder" ? "Nome da pasta" : undefined}
        aria-invalid={error !== null}
      />
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !value.trim()}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {dialog.mode === "folder" ? "Criar pasta" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
