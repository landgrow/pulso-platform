import { isLandGrowDeliverable } from "@/lib/meetings/land-grow-filter";
import { isClosedColumnLabel } from "@/lib/boards/plano-de-acao-template";
import type { ChecklistItem } from "@/types/meetings";

export interface WorkGraphTaskInput {
  id: string;
  titulo: string;
  columnLabel: string;
  prazo: string | null;
  sourceMeetingId: string | null;
  sourceChecklistItemId: string | null;
  orgName: string;
  orgSlug: string;
  isInternal: boolean;
  relatedOrgName: string | null;
  responsavelNome: string | null;
}

export interface WorkGraphMeetingInput {
  id: string;
  titulo: string;
  data: string;
  orgName: string;
  orgSlug: string;
  isInternal: boolean;
  checklist: ChecklistItem[];
}

export interface WorkGraphTask {
  id: string;
  meetingId: string | null;
  titulo: string;
  columnLabel: string;
  closed: boolean;
  prazo: string | null;
  orgName: string;
  orgSlug: string;
  isInternal: boolean;
  clientName: string | null;
  responsavelNome: string | null;
  href: string;
}

export interface WorkGraphPending {
  id: string;
  texto: string;
}

export interface WorkGraphMeeting {
  id: string;
  titulo: string;
  data: string;
  orgName: string;
  orgSlug: string;
  isInternal: boolean;
  href: string;
  tasks: WorkGraphTask[];
  pending: WorkGraphPending[];
  skippedClientOps: number;
}

export interface WorkGraphData {
  meetings: WorkGraphMeeting[];
  loose: WorkGraphTask[];
  counts: {
    meetings: number;
    tasks: number;
    open: number;
    semResponsavel: number;
    semCliente: number;
    pending: number;
  };
}

export function trabalhoHref(isInternal: boolean, slug: string): string {
  return isInternal ? "/admin/atividades" : `/admin/clientes/${slug}`;
}

export function relatedOrgIdFromMeeting(
  isInternal: boolean,
  orgId: string,
): string | null {
  return isInternal ? null : orgId;
}

export function taskClientName(
  task: Pick<WorkGraphTaskInput, "relatedOrgName" | "isInternal" | "orgName">,
  meeting: Pick<WorkGraphMeetingInput, "isInternal" | "orgName"> | null,
): string | null {
  if (task.relatedOrgName) return task.relatedOrgName;
  if (meeting && !meeting.isInternal) return meeting.orgName;
  if (!task.isInternal) return task.orgName;
  return null;
}

export function mapTask(
  task: WorkGraphTaskInput,
  meeting: WorkGraphMeetingInput | null,
): WorkGraphTask {
  const orgSlug = meeting?.orgSlug ?? task.orgSlug;
  const isInternal = meeting?.isInternal ?? task.isInternal;
  return {
    id: task.id,
    meetingId: meeting?.id ?? task.sourceMeetingId,
    titulo: task.titulo,
    columnLabel: task.columnLabel,
    closed: isClosedColumnLabel(task.columnLabel),
    prazo: task.prazo,
    orgName: meeting?.orgName ?? task.orgName,
    orgSlug,
    isInternal,
    clientName: taskClientName(task, meeting),
    responsavelNome: task.responsavelNome,
    href: trabalhoHref(isInternal, orgSlug),
  };
}

export function buildWorkGraph(input: {
  meetings: WorkGraphMeetingInput[];
  cards: WorkGraphTaskInput[];
}): WorkGraphData {
  const meetingsById = new Map(input.meetings.map((row) => [row.id, row]));
  const cardsByMeeting = new Map<string, WorkGraphTaskInput[]>();
  const looseInputs: WorkGraphTaskInput[] = [];

  for (const card of input.cards) {
    if (card.sourceMeetingId && meetingsById.has(card.sourceMeetingId)) {
      const list = cardsByMeeting.get(card.sourceMeetingId) ?? [];
      list.push(card);
      cardsByMeeting.set(card.sourceMeetingId, list);
    } else {
      looseInputs.push(card);
    }
  }

  const meetings: WorkGraphMeeting[] = [...input.meetings]
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((meeting) => {
      const rawTasks = cardsByMeeting.get(meeting.id) ?? [];
      const linkedIds = new Set(
        rawTasks
          .map((card) => card.sourceChecklistItemId)
          .filter((id): id is string => Boolean(id)),
      );
      const pending: WorkGraphPending[] = [];
      let skippedClientOps = 0;
      for (const item of meeting.checklist) {
        if (!isLandGrowDeliverable(item.texto)) {
          skippedClientOps += 1;
          continue;
        }
        if (linkedIds.has(item.id) || item.done) continue;
        pending.push({ id: item.id, texto: item.texto });
      }
      return {
        id: meeting.id,
        titulo: meeting.titulo,
        data: meeting.data,
        orgName: meeting.orgName,
        orgSlug: meeting.orgSlug,
        isInternal: meeting.isInternal,
        href: trabalhoHref(meeting.isInternal, meeting.orgSlug),
        tasks: rawTasks.map((card) => mapTask(card, meeting)),
        pending,
        skippedClientOps,
      };
    });

  const loose = looseInputs.map((card) => mapTask(card, null));
  const allTasks = [...meetings.flatMap((row) => row.tasks), ...loose];
  const open = allTasks.filter((task) => !task.closed);

  return {
    meetings,
    loose,
    counts: {
      meetings: meetings.length,
      tasks: allTasks.length,
      open: open.length,
      semResponsavel: open.filter((task) => !task.responsavelNome).length,
      semCliente: open.filter((task) => !task.clientName).length,
      pending: meetings.reduce((sum, row) => sum + row.pending.length, 0),
    },
  };
}
