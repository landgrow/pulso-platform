import { z } from "zod";
import { FORMULARIO_BLOCOS } from "@/lib/formulario-questions";

/**
 * Constrói o schema Zod de validação do formulário de coleta.
 * Cada campo gera uma regra Zod com base no seu `tipo` e `required`.
 */
export function buildFormularioSchema() {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const bloco of FORMULARIO_BLOCOS) {
    for (const campo of bloco.perguntas) {
      let field: z.ZodTypeAny;

      switch (campo.tipo) {
        case "number": {
          field = z.coerce
            .number({
              invalid_type_error: "Deve ser um número",
            })
            .finite();
          const rules: z.ZodNumber[] = [];
          if (campo.min !== undefined) rules.push(z.number().min(campo.min));
          if (campo.max !== undefined) rules.push(z.number().max(campo.max));
          if (rules.length > 0) {
            field = (field as z.ZodNumber).refine(
              (v) => rules.every((r) => r.safeParse(v).success),
              {
                message: `Valor fora do intervalo permitido (${campo.min ?? ""}–${campo.max ?? ""})`,
              },
            );
          }
          if (!campo.required) {
            // Aceita string vazia como "não informado" — e .optional() no final é
            // obrigatório aqui: sem ele, omitir a chave inteira do payload (o caso
            // normal de "não preencheu") falha, porque nenhum dos dois ramos do
            // union aceita `undefined` sozinho.
            field = z
              .union([z.string().max(0), field])
              .transform((v) =>
                typeof v === "string" && v === "" ? undefined : v,
              )
              .optional();
          }
          break;
        }

        case "radio":
        case "select": {
          const values = campo.opcoes?.map((o) => o.value) ?? [];
          field = z.string();
          if (values.length > 0) {
            field = z.string().refine((v) => values.includes(v), {
              message: `Selecione uma das opções válidas`,
            });
          }
          if (!campo.required) {
            field = field.optional();
          }
          break;
        }

        case "textarea": {
          field = z.string();
          if (campo.minLength !== undefined) {
            field = (field as z.ZodString).min(campo.minLength, {
              message: `Mínimo de ${campo.minLength} caracteres`,
            });
          }
          if (campo.maxLength !== undefined) {
            field = (field as z.ZodString).max(campo.maxLength, {
              message: `Máximo de ${campo.maxLength} caracteres`,
            });
          }
          if (!campo.required) {
            field = field.optional();
          }
          break;
        }

        case "text":
        default: {
          field = z.string();
          if (campo.minLength !== undefined) {
            field = (field as z.ZodString).min(campo.minLength);
          }
          if (campo.maxLength !== undefined) {
            field = (field as z.ZodString).max(campo.maxLength);
          }
          if (!campo.required) {
            field = field.optional();
          }
          break;
        }
      }

      // .refine() (usado em radio/select) devolve ZodEffects, que não tem .min() —
      // por isso o "obrigatório" precisa ser outro .refine(), não .min(), pra
      // funcionar tanto em ZodString (text/textarea) quanto em ZodEffects (radio/select).
      shape[campo.id] =
        campo.required && campo.tipo !== "number"
          ? field.refine((v) => typeof v === "string" && v.trim().length > 0, {
              message: "Campo obrigatório",
            })
          : field;
    }
  }

  return z.object(shape);
}

export type FormularioPayload = z.infer<
  ReturnType<typeof buildFormularioSchema>
>;

/**
 * Computa o % de preenchimento do formulário.
 */
export function calcProgresso(payload: Partial<FormularioPayload>): number {
  const allCampos = FORMULARIO_BLOCOS.flatMap((b) => b.perguntas);
  const obrigatorios = allCampos.filter((c) => c.required);
  if (obrigatorios.length === 0) return 100;
  const preenchidos = obrigatorios.filter((c) => {
    const val = payload[c.id as keyof FormularioPayload];
    return val !== undefined && val !== null && val !== "";
  });
  return Math.round((preenchidos.length / obrigatorios.length) * 100);
}

/**
 * Conta campos preenchidos de cada bloco para mostrar "X de Y campos".
 */
export function countPerBlock(
  payload: Partial<FormularioPayload>,
): Record<string, { filled: number; total: number; required: number }> {
  const result: Record<
    string,
    { filled: number; total: number; required: number }
  > = {};
  for (const bloco of FORMULARIO_BLOCOS) {
    let filled = 0,
      total = 0,
      required = 0;
    for (const campo of bloco.perguntas) {
      total++;
      if (campo.required) required++;
      const val = payload[campo.id as keyof FormularioPayload];
      if (val !== undefined && val !== null && val !== "") filled++;
    }
    result[bloco.area] = { filled, total, required };
  }
  return result;
}
