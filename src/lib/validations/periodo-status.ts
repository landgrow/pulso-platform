import { z } from "zod";

export const markReadySchema = z.object({
  periodId: z.string().uuid("ID de período inválido"),
});
