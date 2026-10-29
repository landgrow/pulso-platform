"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard, PageHeader } from "@/components/ui/page-header";
import { generateCardsFromMeeting } from "@/app/actions/meetings";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type {
  WorkGraphData,
  WorkGraphMeeting,
  WorkGraphTask,
} from "@/lib/trabalho/graph";

type Filter = "todos" | "semResponsavel" | "semCliente" | "pending";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-xs font-medium transition-colors duration-150",
        active
          ? "border-primary bg-surface-2 text-text-1"
          : "border-border bg-transparent text-text-2 hover:bg-surface-2 hover:text-text-1",
      )}
    >
      {children}
    </button>
  );
}

function TaskRow({ task }: { task: WorkGraphTask }): JSX.Element {
  return (
    <div className="grid gap-2 border-t border-border px-4 py-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]">
      <div className="min-w-0">
        <p className="truncate text-sm text-text-1">{task.titulo}</p>
        <p className="text-[11px] text-text-3">{task.columnLabel}</p>
      </div>
      <p className="text-xs text-text-2">{task.clientName ?? "Sem cliente"}</p>
      <p className="text-xs text-text-2">
        {task.responsavelNome ?? "Sem responsável"}
      </p>
      <Button asChild variant="ghost" size="sm" className="justify-self-end">
        <Link href={task.href}>Abrir</Link>
      </Button>
    </div>
  );
}

function MeetingBlock({ meeting }: { meeting: WorkGraphMeeting }): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function generate(): Promise<void> {
    setBusy(true);
    const result = await generateCardsFromMeeting(meeting.id);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.data.created > 0
        ? `${result.data.created} tarefa(s) no Plano de Ação.`
        : "Nada novo para gerar.",
    );
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-text-1">
                {meeting.titulo}
              </p>
              <Badge variant="outline" className="text-[11px] font-medium">
                {meeting.isInternal ? "Land Grow" : meeting.orgName}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-text-3">
              Reunião · {formatDate(meeting.data)} → tarefa → cliente →
              responsável
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {meeting.pending.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void generate()}
              >
                Virar tarefas
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link href={meeting.href}>Abrir</Link>
            </Button>
          </div>
        </div>

        {meeting.tasks.length === 0 && meeting.pending.length === 0 ? (
          <p className="border-t border-border px-4 py-3 text-xs text-text-3">
            Esta reunião ainda não gerou tarefa da Land Grow.
            {meeting.skippedClientOps > 0
              ? ` ${meeting.skippedClientOps} item(ns) do checklist ficaram de fora porque são operação do cliente.`
              : ""}
          </p>
        ) : null}

        {meeting.pending.map((item) => (
          <div
            key={item.id}
            className="border-t border-dashed border-border px-4 py-2.5"
          >
            <p className="text-sm text-text-2">{item.texto}</p>
            <p className="text-[11px] text-text-3">
              No checklist — ainda não virou card.
            </p>
          </div>
        ))}

        {meeting.tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </CardContent>
    </Card>
  );
}

export function WorkGraphView({ data }: { data: WorkGraphData }): JSX.Element {
  const [filter, setFilter] = useState<Filter>("todos");

  const meetings = useMemo(() => {
    return data.meetings.filter((meeting) => {
      if (filter === "pending") return meeting.pending.length > 0;
      if (filter === "semResponsavel") {
        return meeting.tasks.some(
          (task) => !task.closed && !task.responsavelNome,
        );
      }
      if (filter === "semCliente") {
        return meeting.tasks.some((task) => !task.closed && !task.clientName);
      }
      return true;
    });
  }, [data.meetings, filter]);

  const loose = useMemo(() => {
    if (filter === "pending") return [];
    return data.loose.filter((task) => {
      if (task.closed && filter !== "todos") return false;
      if (filter === "semResponsavel") return !task.responsavelNome;
      if (filter === "semCliente") return !task.clientName;
      return true;
    });
  }, [data.loose, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grafo de trabalho"
        description="Reunião gera tarefa. Tarefa tem cliente e responsável. Sem tela de projeto genérico — é o que já sai da reunião, amarrado."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Reuniões" value={String(data.counts.meetings)} />
        <KpiCard
          label="Tarefas abertas"
          value={String(data.counts.open)}
          hint={`${data.counts.tasks} no total`}
        />
        <KpiCard
          label="Sem responsável"
          value={String(data.counts.semResponsavel)}
          accent="neutral"
        />
        <KpiCard
          label="Checklist parado"
          value={String(data.counts.pending)}
          hint="Entrega da Land Grow que ainda não virou card"
          accent="neutral"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip active={filter === "todos"} onClick={() => setFilter("todos")}>
          Todas
        </Chip>
        <Chip
          active={filter === "semResponsavel"}
          onClick={() => setFilter("semResponsavel")}
        >
          Sem responsável
        </Chip>
        <Chip
          active={filter === "semCliente"}
          onClick={() => setFilter("semCliente")}
        >
          Sem cliente
        </Chip>
        <Chip
          active={filter === "pending"}
          onClick={() => setFilter("pending")}
        >
          Checklist parado
        </Chip>
      </div>

      {meetings.length === 0 && loose.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-text-1">
              Nada neste período
            </p>
            <p className="mt-1 text-sm text-text-2">
              Abra Reuniões, marque o que a Land Grow entrega, e a tarefa
              aparece aqui ligada ao cliente.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {meetings.map((meeting) => (
        <MeetingBlock key={meeting.id} meeting={meeting} />
      ))}

      {loose.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
            Tarefas sem reunião
          </h2>
          <Card>
            <CardContent className="p-0">
              {loose.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
