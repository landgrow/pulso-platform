import type { WorkflowAction, WorkflowTrigger } from "@/lib/sala/workflows";

export type SalaChannelKind = "channel" | "dm";

export const SALA_EMOJIS = ["👍", "👀", "✅", "❗"] as const;
export type SalaEmoji = (typeof SALA_EMOJIS)[number];

export interface SalaStaff {
  userId: string;
  name: string;
}

export interface SalaChannel {
  id: string;
  kind: SalaChannelKind;
  slug: string | null;
  name: string;
  topic: string | null;
  displayName: string;
  unread: number;
  lastMessageAt: string | null;
  lastPreview: string | null;
  peerId: string | null;
}

export interface SalaReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export type SalaMessageKind = "user" | "bot" | "system";

export interface SalaFile {
  id: string;
  channelId: string;
  messageId: string | null;
  name: string;
  mime: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export interface SalaCanvasComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface SalaCanvas {
  id: string;
  channelId: string;
  title: string;
  body: string;
  updatedAt: string;
  comments: SalaCanvasComment[];
}

export interface SalaListItem {
  id: string;
  title: string;
  done: boolean;
  dueOn: string | null;
  assigneeId: string | null;
}

export interface SalaList {
  id: string;
  channelId: string | null;
  title: string;
  items: SalaListItem[];
}

export interface SalaCirculo {
  channelId: string;
  startedBy: string;
  startedAt: string;
  peers: { userId: string; name: string }[];
}

export interface SalaMessage {
  id: string;
  channelId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  replyCount: number;
  reactions: SalaReaction[];
  kind: SalaMessageKind;
  files: SalaFile[];
}

export interface SalaBootstrap {
  meId: string;
  channels: SalaChannel[];
  staff: SalaStaff[];
}

export type SalaSearchKind =
  | "message"
  | "file"
  | "person"
  | "channel"
  | "canvas"
  | "event"
  | "list"
  | "crm";

export interface SalaSearchHit {
  kind: SalaSearchKind;
  id: string;
  title: string;
  snippet: string;
  channelId: string | null;
  channelName: string;
  message?: SalaMessage;
}

export interface SalaWorkflow {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  triggerLabel: string;
  actionLabel: string;
  lastRunAt: string | null;
  trigger: WorkflowTrigger | null;
  action: WorkflowAction | null;
}

export interface SalaPulse {
  crmOpen: number;
  meetings7d: number;
  due7d: number;
  conversionRate: number | null;
}
