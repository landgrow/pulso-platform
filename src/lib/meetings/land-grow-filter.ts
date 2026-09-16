/**
 * Só vira card no kanban o que a Land Grow produz e acompanha.
 * Tarefa operacional do cliente (citada na reunião) fica no checklist,
 * mas não entra no Plano de Ação.
 */
const CLIENT_OPS: RegExp[] = [
  /^\[cliente\]/i,
  /^\[ops\]/i,
  /agendar apresenta/i,
  /criar projeto/i,
  /preparar proposta/i,
  /contatar cliente/i,
  /ligar para/i,
  /cobrar cliente/i,
  /enviar or[cç]amento/i,
];

export function isLandGrowDeliverable(texto: string): boolean {
  const trimmed = texto.trim();
  if (!trimmed) return false;
  return !CLIENT_OPS.some((pattern) => pattern.test(trimmed));
}
