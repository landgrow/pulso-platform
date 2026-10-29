"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Bell,
  CalendarDays,
  Hash,
  Headphones,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Workflow,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createSalaChannel,
  listSala,
  listSalaMessages,
  markSalaRead,
  openSalaDm,
  sendSalaMessage,
  toggleSalaReaction,
} from "@/app/actions/sala";
import {
  askSalaAgent,
  attachSalaFile,
  createSalaFileUpload,
  getSalaCanvas,
  getSalaCirculo,
  getSalaFileUrl,
  joinSalaCirculo,
  leaveSalaCirculo,
  listSalaFiles,
  searchSalaUniverse,
} from "@/app/actions/sala-ops";
import { SalaCanvasStudio } from "@/components/sala/sala-canvas";
import { SalaHome } from "@/components/sala/sala-home";
import { SalaLists } from "@/components/sala/sala-lists";
import { SalaWorkflows } from "@/components/sala/sala-workflows";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  commentSegments,
  insertMention,
  mentionQuery,
} from "@/lib/boards/card-people";
import { createClient } from "@/lib/supabase/client";
import { formatSalaTime, initials, isPulsoPrompt } from "@/lib/sala/dm";
import {
  filterSalaMentions,
  salaMentionLabel,
  salaMentionPeople,
} from "@/lib/sala/mentions";
import { cn } from "@/lib/utils";
import {
  SALA_EMOJIS,
  type SalaCanvas,
  type SalaChannel,
  type SalaCirculo,
  type SalaFile,
  type SalaMessage,
  type SalaSearchHit,
  type SalaStaff,
} from "@/types/sala";

type SalaView = "home" | "unread" | "chat" | "files" | "workflows" | "lists";
type ChannelPane = "mensagens" | "canvas" | "rastreador" | "fluxos";

export function SalaWorkspace(): JSX.Element {
  const router = useRouter();
  const [view, setView] = useState<SalaView>("home");
  const [channelPane, setChannelPane] = useState<ChannelPane>("mensagens");
  const [canvas, setCanvas] = useState<SalaCanvas | null>(null);
  const [circulo, setCirculo] = useState<SalaCirculo | null>(null);
  const [meId, setMeId] = useState("");
  const [channels, setChannels] = useState<SalaChannel[]>([]);
  const [staff, setStaff] = useState<SalaStaff[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SalaMessage[]>([]);
  const [thread, setThread] = useState<SalaMessage[]>([]);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [threadDraft, setThreadDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SalaSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const active = channels.find((channel) => channel.id === activeId) ?? null;
  const threadParent =
    thread.find((message) => message.id === threadParentId) ?? null;
  const threadReplies = thread.filter(
    (message) => message.parentId === threadParentId,
  );

  const refreshList = useCallback(async (): Promise<SalaChannel[]> => {
    const result = await listSala();
    if (!result.success) {
      setError(result.error);
      return [];
    }
    setError(null);
    setMeId(result.data.meId);
    setChannels(result.data.channels);
    setStaff(result.data.staff);
    return result.data.channels;
  }, []);

  const loadMessages = useCallback(async (channelId: string): Promise<void> => {
    const result = await listSalaMessages(channelId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessages(result.data);
    await markSalaRead(channelId);
    window.dispatchEvent(new Event("pulso:sala-read"));
  }, []);

  const loadThread = useCallback(
    async (channelId: string, parentId: string): Promise<void> => {
      const result = await listSalaMessages(channelId, parentId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setThread(result.data);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const listed = await refreshList();
      if (cancelled) return;
      const first =
        listed.find(
          (channel) => channel.kind === "channel" && channel.slug === "geral",
        ) ??
        listed[0] ??
        null;
      if (first) {
        setActiveId(first.id);
        await loadMessages(first.id);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMessages, refreshList]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("staff-sala")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff_messages" },
        (payload: {
          new?: { channel_id?: string; parent_id?: string | null };
        }) => {
          const channelId = payload.new?.channel_id;
          if (channelId && channelId === activeId) {
            void loadMessages(channelId);
            if (threadParentId) void loadThread(channelId, threadParentId);
          }
          void refreshList();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff_message_reactions" },
        () => {
          if (activeId) void loadMessages(activeId);
          if (activeId && threadParentId)
            void loadThread(activeId, threadParentId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId, loadMessages, loadThread, refreshList, threadParentId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [thread]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchSalaUniverse(q).then((result) => {
        setSearching(false);
        if (result.success) setHits(result.data);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function selectChannel(channelId: string): Promise<void> {
    setView("chat");
    setChannelPane("mensagens");
    setActiveId(channelId);
    setThreadParentId(null);
    setThread([]);
    setQuery("");
    await loadMessages(channelId);
    const [canvasResult, circuloResult] = await Promise.all([
      getSalaCanvas(channelId),
      getSalaCirculo(channelId),
    ]);
    setCanvas(canvasResult.success ? canvasResult.data : null);
    setCirculo(circuloResult.success ? circuloResult.data : null);
    await refreshList();
  }

  async function submitMessage(
    body: string,
    parentId: string | null,
  ): Promise<boolean> {
    if (!activeId || sending) return false;
    const text = body.trim();
    if (!text) return false;
    setSending(true);
    const payload: { channelId: string; body: string; parentId?: string } = {
      channelId: activeId,
      body: text,
    };
    if (parentId) payload.parentId = parentId;
    const result = await sendSalaMessage(payload);
    setSending(false);
    if (!result.success) {
      setError(result.error);
      return false;
    }
    setError(null);
    if (parentId) {
      await loadThread(activeId, parentId);
      await loadMessages(activeId);
    } else {
      setMessages((current) =>
        current.some((item) => item.id === result.data.id)
          ? current
          : [...current, result.data],
      );
    }
    if (isPulsoPrompt(text) && !parentId) {
      const agent = await askSalaAgent(activeId, text);
      if (!agent.success) setError(agent.error);
      else await loadMessages(activeId);
    }
    await refreshList();
    return true;
  }

  async function onReact(message: SalaMessage, emoji: string): Promise<void> {
    const result = await toggleSalaReaction(message.id, emoji);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessages((current) =>
      current.map((item) => (item.id === result.data.id ? result.data : item)),
    );
    setThread((current) =>
      current.map((item) => (item.id === result.data.id ? result.data : item)),
    );
  }

  const publicChannels = useMemo(
    () => channels.filter((channel) => channel.kind === "channel"),
    [channels],
  );
  const dms = useMemo(
    () => channels.filter((channel) => channel.kind === "dm"),
    [channels],
  );
  const dmCandidates = staff.filter((person) => person.userId !== meId);

  const unreadTotal = channels.reduce(
    (sum, channel) => sum + channel.unread,
    0,
  );
  const searchHits = query.trim().length >= 2 ? hits : [];

  return (
    <div className="-mx-5 -my-5 flex h-[calc(100dvh-3.5rem)] min-h-[28rem] overflow-hidden border-y border-border bg-surface-1 md:-mx-8">
      <nav className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-brand-navy-deep py-3 md:flex">
        <RailIcon
          label="Início"
          active={view === "home"}
          onClick={() => setView("home")}
          icon={<CalendarDays className="size-4" />}
        />
        <RailIcon
          label="Conversas"
          active={view === "chat"}
          onClick={() => setView("chat")}
          icon={<Hash className="size-4" />}
        />
        <RailIcon
          label="Não lidas"
          active={view === "unread"}
          onClick={() => setView("unread")}
          icon={<Bell className="size-4" />}
          badge={unreadTotal}
        />
        <RailIcon
          label="Arquivos"
          active={view === "files"}
          onClick={() => setView("files")}
          icon={<Paperclip className="size-4" />}
        />
        <RailIcon
          label="Fluxos"
          active={view === "workflows"}
          onClick={() => setView("workflows")}
          icon={<Workflow className="size-4" />}
        />
        <RailIcon
          label="Listas"
          active={view === "lists"}
          onClick={() => setView("lists")}
          icon={<ListChecks className="size-4" />}
        />
      </nav>
      <aside className="hidden w-[15.5rem] shrink-0 flex-col border-r border-border bg-surface-2 md:flex">
        <div className="border-b border-border px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-3">
            Sala
          </p>
          <h1 className="mt-1 text-sm font-semibold text-text-1">
            Equipe Land Grow
          </h1>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-text-3" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mensagens, arquivos, pessoas, agenda"
              className="h-9 bg-surface-1 pl-8 text-xs"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {query.trim().length >= 2 ? (
            <SearchResults
              hits={searchHits}
              searching={searching && query.trim().length >= 2}
              onPick={(hit) => {
                if (hit.kind === "event") {
                  router.push("/admin/calendario");
                  return;
                }
                if (hit.kind === "crm") {
                  router.push("/admin/crm");
                  return;
                }
                if (hit.kind === "list") {
                  setView("lists");
                  return;
                }
                if (hit.kind === "person") {
                  void (async () => {
                    const result = await openSalaDm(hit.id);
                    if (!result.success) {
                      setError(result.error);
                      return;
                    }
                    await refreshList();
                    await selectChannel(result.data.id);
                  })();
                  return;
                }
                if (hit.channelId) void selectChannel(hit.channelId);
              }}
            />
          ) : (
            <>
              <RailSection
                title="Canais"
                action={
                  <button
                    type="button"
                    onClick={() => setChannelOpen(true)}
                    className="rounded p-0.5 text-text-3 hover:bg-surface-3 hover:text-text-1"
                    aria-label="Novo canal"
                  >
                    <Plus className="size-3.5" />
                  </button>
                }
              >
                {publicChannels.map((channel) => (
                  <ChannelButton
                    key={channel.id}
                    channel={channel}
                    active={channel.id === activeId}
                    onClick={() => void selectChannel(channel.id)}
                    icon={<Hash className="size-3.5 shrink-0" />}
                  />
                ))}
              </RailSection>
              <RailSection
                title="Mensagens diretas"
                action={
                  <button
                    type="button"
                    onClick={() => setDmOpen(true)}
                    className="rounded p-0.5 text-text-3 hover:bg-surface-3 hover:text-text-1"
                    aria-label="Nova conversa"
                  >
                    <Plus className="size-3.5" />
                  </button>
                }
              >
                {dms.length === 0 ? (
                  <p className="px-2 py-1 text-[11px] text-text-3">
                    Uma conversa por vez, só com a equipe.
                  </p>
                ) : (
                  dms.map((channel) => (
                    <ChannelButton
                      key={channel.id}
                      channel={channel}
                      active={channel.id === activeId}
                      onClick={() => void selectChannel(channel.id)}
                      icon={<MessageSquare className="size-3.5 shrink-0" />}
                    />
                  ))
                )}
              </RailSection>
            </>
          )}
        </div>
      </aside>

      {view === "home" ? (
        <div className="min-w-0 flex-1 overflow-y-auto">
          <SalaHome />
        </div>
      ) : null}
      {view === "workflows" ? (
        <div className="min-w-0 flex-1 overflow-y-auto">
          <SalaWorkflows />
        </div>
      ) : null}
      {view === "lists" ? (
        <div className="min-w-0 flex-1 overflow-y-auto">
          <SalaLists />
        </div>
      ) : null}
      {view === "files" ? <SalaFilesPane /> : null}
      {view === "unread" ? (
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-8">
          <h2 className="text-xl font-semibold text-text-1">Não lidas</h2>
          <p className="mt-1 text-sm text-text-2">
            Canais e DMs com recado novo.
          </p>
          <ul className="mt-4 space-y-1">
            {channels.filter((channel) => channel.unread > 0).length === 0 ? (
              <li className="text-sm text-text-3">Nada por ler.</li>
            ) : (
              channels
                .filter((channel) => channel.unread > 0)
                .map((channel) => (
                  <li key={channel.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-border px-3 py-2 text-left hover:bg-surface-2"
                      onClick={() => void selectChannel(channel.id)}
                    >
                      <p className="text-sm font-medium text-text-1">
                        {channel.kind === "channel"
                          ? `#${channel.displayName}`
                          : channel.displayName}
                      </p>
                      <p className="truncate text-xs text-text-3">
                        {channel.lastPreview ?? `${channel.unread} novas`}
                      </p>
                    </button>
                  </li>
                ))
            )}
          </ul>
        </div>
      ) : null}
      {view === "chat" ? (
        <div className="flex min-w-0 flex-1">
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-border px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-text-1">
                    {active?.kind === "channel"
                      ? `# ${active.displayName}`
                      : (active?.displayName ?? "Sala")}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  {activeId ? (
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          if (circulo) {
                            await leaveSalaCirculo(activeId);
                            setCirculo(null);
                          } else {
                            const result = await joinSalaCirculo(activeId);
                            if (result.success) setCirculo(result.data);
                            else setError(result.error);
                          }
                        })();
                      }}
                      className="rounded-md p-2 text-text-3 hover:bg-surface-2 hover:text-text-1"
                      title="Círculo"
                    >
                      <Headphones className="size-4" />
                    </button>
                  ) : null}
                  <select
                    className="h-9 rounded-md border border-border bg-surface-1 px-2 text-xs md:hidden"
                    value={activeId ?? ""}
                    onChange={(event) => void selectChannel(event.target.value)}
                  >
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.kind === "channel"
                          ? `#${channel.displayName}`
                          : channel.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {active?.kind === "channel" ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {(
                    [
                      ["mensagens", "Mensagens"],
                      ["canvas", "Notas"],
                      ["rastreador", "Rastreador"],
                      ["fluxos", "Fluxos"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setChannelPane(id)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs",
                        channelPane === id
                          ? "bg-primary text-primary-foreground"
                          : "text-text-2 hover:bg-surface-2",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </header>

            {error ? (
              <p className="border-b border-error/30 bg-error/10 px-5 py-2 text-xs text-error">
                {error}
              </p>
            ) : null}

            {active?.kind === "channel" &&
            channelPane === "canvas" &&
            activeId ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <SalaCanvasStudio
                  key={activeId}
                  channelId={activeId}
                  canvas={canvas}
                  onChange={setCanvas}
                />
              </div>
            ) : null}
            {active?.kind === "channel" &&
            channelPane === "rastreador" &&
            activeId ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <SalaLists channelId={activeId} />
              </div>
            ) : null}
            {active?.kind === "channel" && channelPane === "fluxos" ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <SalaWorkflows channelSlug={active.slug ?? "geral"} />
              </div>
            ) : null}
            {channelPane === "mensagens" || active?.kind === "dm" ? (
              <>
                <div
                  ref={listRef}
                  className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
                >
                  {circulo ? (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-2">
                      <Headphones className="size-3.5" />
                      Círculo aberto ·{" "}
                      {circulo.peers.map((peer) => peer.name).join(", ")}
                    </div>
                  ) : null}
                  {loading ? (
                    <p className="text-sm text-text-3">Abrindo a sala…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-text-3">
                      Ninguém escreveu ainda. Manda o primeiro recado.
                    </p>
                  ) : (
                    messages.map((message) => (
                      <MessageRow
                        key={message.id}
                        message={message}
                        people={staff}
                        onReact={(emoji) => void onReact(message, emoji)}
                        onThread={() => {
                          if (!activeId) return;
                          setThreadParentId(message.id);
                          void loadThread(activeId, message.id);
                        }}
                      />
                    ))
                  )}
                </div>

                <Composer
                  value={draft}
                  people={staff}
                  disabled={!activeId || sending}
                  placeholder={
                    active?.kind === "dm"
                      ? `Mensagem para ${active.displayName}`
                      : `Mensagem em #${active?.displayName ?? "canal"}`
                  }
                  onChange={setDraft}
                  onAttach={async (file) => {
                    if (!activeId) return;
                    const prepared = await createSalaFileUpload(
                      activeId,
                      file.name,
                      file.size,
                    );
                    if (!prepared.success) {
                      setError(prepared.error);
                      return;
                    }
                    const supabase = createClient();
                    const { error: uploadError } = await supabase.storage
                      .from("evidencias")
                      .uploadToSignedUrl(
                        prepared.data.path,
                        prepared.data.token,
                        file,
                        {
                          contentType: file.type || "application/octet-stream",
                        },
                      );
                    if (uploadError) {
                      setError("Não enviei o arquivo.");
                      return;
                    }
                    const attachedPayload: {
                      channelId: string;
                      path: string;
                      name: string;
                      mime?: string;
                      size?: number;
                    } = {
                      channelId: activeId,
                      path: prepared.data.path,
                      name: prepared.data.name,
                      size: file.size,
                    };
                    if (file.type) attachedPayload.mime = file.type;
                    const attached = await attachSalaFile(attachedPayload);
                    if (!attached.success) {
                      setError(attached.error);
                      return;
                    }
                    await loadMessages(activeId);
                  }}
                  onSend={async () => {
                    if (await submitMessage(draft, null)) setDraft("");
                  }}
                />
              </>
            ) : null}
          </section>

          {threadParent ? (
            <aside className="flex w-[22rem] shrink-0 flex-col border-l border-border bg-surface-1">
              <header className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-text-1">Thread</p>
                  <p className="text-[11px] text-text-3">
                    Respostas neste recado
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setThreadParentId(null);
                    setThread([]);
                  }}
                  className="rounded-md p-1 text-text-3 hover:bg-surface-2 hover:text-text-1"
                  aria-label="Fechar thread"
                >
                  <X className="size-4" />
                </button>
              </header>
              <div
                ref={threadRef}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
              >
                <MessageRow
                  message={threadParent}
                  people={staff}
                  onReact={(emoji) => void onReact(threadParent, emoji)}
                />
                <div className="my-3 h-px bg-border" />
                {threadReplies.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    people={staff}
                    onReact={(emoji) => void onReact(message, emoji)}
                  />
                ))}
              </div>
              <Composer
                value={threadDraft}
                people={staff}
                disabled={sending}
                placeholder="Responder na thread"
                onChange={setThreadDraft}
                onSend={async () => {
                  if (await submitMessage(threadDraft, threadParent.id))
                    setThreadDraft("");
                }}
              />
            </aside>
          ) : null}
        </div>
      ) : null}

      <Dialog open={channelOpen} onOpenChange={setChannelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo canal</DialogTitle>
            <DialogDescription>Canais são da equipe inteira.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                const payload: { name: string; topic?: string } = {
                  name: newName,
                };
                if (newTopic.trim()) payload.topic = newTopic.trim();
                const result = await createSalaChannel(payload);
                if (!result.success) {
                  setError(result.error);
                  return;
                }
                setChannelOpen(false);
                setNewName("");
                setNewTopic("");
                await refreshList();
                await selectChannel(result.data.id);
              })();
            }}
          >
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Nome do canal"
              required
            />
            <Input
              value={newTopic}
              onChange={(event) => setNewTopic(event.target.value)}
              placeholder="Assunto (opcional)"
            />
            <Button type="submit" className="w-full">
              Criar canal
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dmOpen} onOpenChange={setDmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mensagem direta</DialogTitle>
            <DialogDescription>
              Só aparece para você e para a pessoa escolhida.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {dmCandidates.map((person) => (
              <button
                key={person.userId}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-surface-2"
                onClick={() => {
                  void (async () => {
                    const result = await openSalaDm(person.userId);
                    if (!result.success) {
                      setError(result.error);
                      return;
                    }
                    setDmOpen(false);
                    await refreshList();
                    await selectChannel(result.data.id);
                  })();
                }}
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {initials(person.name)}
                </span>
                {person.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RailIcon({
  label,
  active,
  onClick,
  icon,
  badge = 0,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: JSX.Element;
  badge?: number;
}): JSX.Element {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "relative flex size-9 items-center justify-center rounded-md",
        active
          ? "bg-primary text-primary-foreground"
          : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      {icon}
      {badge > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

function SalaFilesPane(): JSX.Element {
  const [files, setFiles] = useState<SalaFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void listSalaFiles().then((result) => {
      if (result.success) setFiles(result.data);
      else setError(result.error);
    });
  }, []);
  return (
    <div className="min-w-0 flex-1 overflow-y-auto px-6 py-8">
      <h2 className="text-xl font-semibold text-text-1">Arquivos</h2>
      <p className="mt-1 text-sm text-text-2">
        Arquivos da Sala. A busca também cruza canvas, CRM e Calendário.
      </p>
      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
      <ul className="mt-4 space-y-1 text-sm text-text-1">
        {files.length === 0 ? (
          <li className="text-text-3">Nenhum arquivo ainda.</li>
        ) : (
          files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className="text-left text-primary hover:underline"
                onClick={() => {
                  void getSalaFileUrl(file.id).then((result) => {
                    if (result.success) window.open(result.data.url, "_blank");
                  });
                }}
              >
                {file.name}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function RailSection({
  title,
  action,
  children,
}: {
  title: string;
  action: JSX.Element;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between px-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-3">
          {title}
        </p>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ChannelButton({
  channel,
  active,
  onClick,
  icon,
}: {
  channel: SalaChannel;
  active: boolean;
  onClick: () => void;
  icon: JSX.Element;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]",
        active
          ? "bg-primary text-primary-foreground"
          : "text-text-2 hover:bg-surface-3 hover:text-text-1",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{channel.displayName}</span>
      {channel.unread > 0 && !active ? (
        <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
          {channel.unread > 9 ? "9+" : channel.unread}
        </span>
      ) : null}
    </button>
  );
}

function SearchResults({
  hits,
  searching,
  onPick,
}: {
  hits: SalaSearchHit[];
  searching: boolean;
  onPick: (hit: SalaSearchHit) => void;
}): JSX.Element {
  if (searching) return <p className="px-2 text-xs text-text-3">Buscando…</p>;
  if (hits.length === 0) {
    return <p className="px-2 text-xs text-text-3">Nada com esse texto.</p>;
  }
  return (
    <div className="space-y-1">
      {hits.map((hit) => (
        <button
          key={`${hit.kind}-${hit.id}`}
          type="button"
          onClick={() => onPick(hit)}
          className="w-full rounded-md px-2 py-2 text-left hover:bg-surface-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
            {hit.kind} · {hit.channelName}
          </p>
          <p className="truncate text-xs text-text-1">
            {hit.snippet || hit.title}
          </p>
        </button>
      ))}
    </div>
  );
}

function MessageRow({
  message,
  people,
  onReact,
  onThread,
}: {
  message: SalaMessage;
  people: SalaStaff[];
  onReact: (emoji: string) => void;
  onThread?: () => void;
}): JSX.Element {
  const parts = commentSegments(message.body, salaMentionPeople(people));
  return (
    <article className="group mb-3 rounded-md px-1 py-1 hover:bg-surface-2/80">
      <div className="flex gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {initials(message.authorName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-5">
            <span className="font-semibold text-text-1">
              {message.authorName}
            </span>
            <span className="ml-2 text-[11px] text-text-3">
              {formatSalaTime(message.createdAt)}
            </span>
          </p>
          <p className="whitespace-pre-wrap text-[13px] leading-5 text-text-1">
            {parts.map((part, index) =>
              part.mention ? (
                <span
                  key={`${part.text}-${index}`}
                  className="font-medium text-primary"
                >
                  {part.text}
                </span>
              ) : (
                <span key={`${part.text}-${index}`}>{part.text}</span>
              ),
            )}
          </p>
          {message.files.map((file) => (
            <button
              key={file.id}
              type="button"
              className="mt-1 block text-[11px] text-primary hover:underline"
              onClick={() => {
                void getSalaFileUrl(file.id).then((result) => {
                  if (result.success) window.open(result.data.url, "_blank");
                });
              }}
            >
              Arquivo · {file.name}
            </button>
          ))}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => onReact(reaction.emoji)}
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[11px]",
                  reaction.mine
                    ? "border-primary/40 bg-primary/10 text-text-1"
                    : "border-border bg-surface-1 text-text-2",
                )}
              >
                {reaction.emoji} {reaction.count}
              </button>
            ))}
            {SALA_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                className="hidden rounded-full border border-transparent px-1.5 py-0.5 text-[11px] text-text-3 hover:border-border hover:bg-surface-1 group-hover:inline-flex"
              >
                {emoji}
              </button>
            ))}
            {onThread ? (
              <button
                type="button"
                onClick={onThread}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {message.replyCount > 0
                  ? `${message.replyCount} ${message.replyCount === 1 ? "resposta" : "respostas"}`
                  : "Responder"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function Composer({
  value,
  people,
  disabled,
  placeholder,
  onChange,
  onSend,
  onAttach,
}: {
  value: string;
  people: SalaStaff[];
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach?: (file: File) => Promise<void>;
}): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [picked, setPicked] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const mentionables = useMemo(() => salaMentionPeople(people), [people]);
  const query = mentionQuery(value, caret);
  const suggestions = useMemo(() => {
    if (!query || dismissed) return [];
    return filterSalaMentions(mentionables, query.query);
  }, [dismissed, mentionables, query]);
  const mentionOpen = Boolean(query) && !dismissed;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nova menção digitada: volta a sugestão para o topo
    setPicked(0);
    setDismissed(false);
  }, [query?.query, query?.start]);

  function applyMention(person: SalaStaff): void {
    const next = insertMention(value, caret, person.name);
    onChange(next.text);
    setCaret(next.caret);
    requestAnimationFrame(() => {
      const node = areaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(next.caret, next.caret);
    });
  }

  return (
    <form
      className="flex items-end gap-2 border-t border-border px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      {onAttach ? (
        <>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onAttach(file);
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            title="Anexar arquivo"
          >
            <Paperclip className="size-4" />
            <span className="sr-only">Anexar arquivo</span>
          </Button>
        </>
      ) : null}
      <div className="relative min-w-0 flex-1">
        {mentionOpen ? (
          <div
            role="listbox"
            aria-label="Pessoas para marcar"
            className="absolute inset-x-0 bottom-full z-20 mb-1 max-h-56 overflow-y-auto rounded-md border border-border bg-surface-1 shadow-md"
          >
            {suggestions.length === 0 ? (
              <p className="px-3 py-2 text-[13px] text-text-3">
                Ninguém com esse nome.
              </p>
            ) : (
              suggestions.map((person, index) => (
                <button
                  key={person.userId}
                  type="button"
                  role="option"
                  aria-selected={index === picked}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px]",
                    index === picked
                      ? "bg-surface-2 text-text-1"
                      : "text-text-2 hover:bg-surface-2 hover:text-text-1",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applyMention(person);
                  }}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {initials(
                      person.userId === "pulso" ? "PULSO" : person.name,
                    )}
                  </span>
                  <span className="min-w-0 truncate">
                    {salaMentionLabel(person)}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
        <Textarea
          ref={areaRef}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          rows={2}
          className="min-h-[2.75rem] resize-none bg-surface-1 text-[13px]"
          onChange={(event) => {
            onChange(event.target.value);
            setCaret(event.target.selectionStart);
          }}
          onClick={(event) => setCaret(event.currentTarget.selectionStart)}
          onKeyUp={(event) => setCaret(event.currentTarget.selectionStart)}
          onKeyDown={(event) => {
            if (suggestions.length > 0) {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setPicked((current) => (current + 1) % suggestions.length);
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setPicked(
                  (current) =>
                    (current - 1 + suggestions.length) % suggestions.length,
                );
                return;
              }
              if (
                event.key === "Tab" ||
                (event.key === "Enter" && !event.shiftKey)
              ) {
                event.preventDefault();
                const person = suggestions[picked] ?? suggestions[0];
                if (person) applyMention(person);
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDismissed(true);
                return;
              }
            }
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
      </div>
      <Button
        type="submit"
        size="icon"
        disabled={disabled || value.trim().length === 0}
      >
        <Send className="size-4" />
        <span className="sr-only">Enviar</span>
      </Button>
    </form>
  );
}
