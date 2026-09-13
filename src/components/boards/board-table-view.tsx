"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, isOverdue } from "@/lib/utils";
import { SETOR_COLORS } from "@/lib/constants";
import {
  PRIORIDADE_LABELS,
  type Board,
  type BoardCard,
  type BoardProperty,
  type CustomValue,
  type FieldConfig,
} from "@/types/boards";

function isFieldVisible(fieldConfig: FieldConfig, key: string): boolean {
  return fieldConfig[key]?.visible ?? true;
}

const PRIORIDADE_BADGE: Record<
  BoardCard["prioridade"],
  "destructive" | "warning" | "secondary"
> = {
  alta: "destructive",
  media: "warning",
  baixa: "secondary",
};

function renderCustomValue(
  property: BoardProperty,
  value: CustomValue,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (property.type === "checkbox") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (property.type === "date") return formatDate(String(value));
  return String(value);
}

export function BoardTableView({
  board,
  onOpenCard,
}: {
  board: Board;
  onOpenCard: (card: BoardCard) => void;
}): JSX.Element {
  const columnById = Object.fromEntries(board.columns.map((c) => [c.id, c]));
  const rows = [...board.cards].sort((a, b) => {
    const colA = columnById[a.column_id]?.position ?? 0;
    const colB = columnById[b.column_id]?.position ?? 0;
    return colA - colB || a.position - b.position;
  });
  const visibleProperties = board.properties.filter((p) => p.visible);
  const fc = board.field_config;
  const showStatus = isFieldVisible(fc, "status");
  const showPrioridade = isFieldVisible(fc, "prioridade");
  const showResponsavel = isFieldVisible(fc, "responsavel");
  const showPrazo = isFieldVisible(fc, "prazo");
  const showSetor = isFieldVisible(fc, "setor");
  const showCliente = isFieldVisible(fc, "cliente");

  if (rows.length === 0) {
    return (
      <p className="text-sm text-text-2 py-8 text-center">Nenhum card ainda.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Card</TableHead>
          {showStatus && <TableHead>Status</TableHead>}
          {showPrioridade && <TableHead>Prioridade</TableHead>}
          {showResponsavel && <TableHead>Responsável</TableHead>}
          {showPrazo && <TableHead>Prazo</TableHead>}
          {showSetor && <TableHead>Setor</TableHead>}
          {showCliente && <TableHead>Cliente</TableHead>}
          {visibleProperties.map((prop) => (
            <TableHead key={prop.id}>{prop.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((card) => {
          const col = columnById[card.column_id];
          const overdue = isOverdue(card.prazo);
          return (
            <TableRow
              key={card.id}
              onClick={() => onOpenCard(card)}
              className="cursor-pointer"
            >
              <TableCell className="font-medium">{card.titulo}</TableCell>
              {showStatus && (
                <TableCell>
                  {col && (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: col.color }}
                      />
                      {col.label}
                    </span>
                  )}
                </TableCell>
              )}
              {showPrioridade && (
                <TableCell>
                  <Badge variant={PRIORIDADE_BADGE[card.prioridade]}>
                    {PRIORIDADE_LABELS[card.prioridade]}
                  </Badge>
                </TableCell>
              )}
              {showResponsavel && (
                <TableCell className="text-text-2">
                  {card.responsavel_nome ?? "—"}
                </TableCell>
              )}
              {showPrazo && (
                <TableCell
                  className={overdue ? "text-error font-medium" : "text-text-2"}
                >
                  {card.prazo ? formatDate(card.prazo) : "—"}
                </TableCell>
              )}
              {showSetor && (
                <TableCell className="text-text-2">
                  {card.setor ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{
                          background:
                            SETOR_COLORS[card.setor] ?? "var(--text-faint)",
                        }}
                      />
                      {card.setor}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
              )}
              {showCliente && (
                <TableCell className="text-text-2">
                  {card.related_org_name ?? "—"}
                </TableCell>
              )}
              {visibleProperties.map((prop) => (
                <TableCell key={prop.id} className="text-text-2">
                  {renderCustomValue(
                    prop,
                    card.custom_values[prop.key] ?? null,
                  )}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
