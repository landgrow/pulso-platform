import "server-only";

import industriaRaw from "@/data/bin-v2/industria.json";
import servicosRaw from "@/data/bin-v2/instrument.json";
import varejoRaw from "@/data/bin-v2/varejo.json";
import { packIdFor, setDefaultBinInstrument } from "./instrument-core";
import type { BinRoute } from "./route";
import type { BinInstrument, BinPackId } from "./types";

/**
 * Questionários BIN completos — pesos, notas das opções, destinos, camadas.
 * SÓ no servidor ("server-only" quebra o build se uma tela importar isto). As
 * telas recebem a versão pública de `public-instrument.ts`.
 */

export const servicosInstrument = servicosRaw as BinInstrument;
export const varejoInstrument = varejoRaw as BinInstrument;
export const industriaInstrument = industriaRaw as BinInstrument;

export const BIN_INSTRUMENTS: Record<BinPackId, BinInstrument> = {
  servicos: servicosInstrument,
  varejo: varejoInstrument,
  industria: industriaInstrument,
};

/** Compat: o tronco e o formulário de serviços. */
export const binInstrument = servicosInstrument;

setDefaultBinInstrument(binInstrument);

export function instrumentFor(
  route: BinRoute | null | undefined,
): BinInstrument {
  return BIN_INSTRUMENTS[packIdFor(route)];
}

export {
  questionIndex,
  packIdFor,
  getBinQuestion,
  requireBinQuestion,
  getBinSection,
  questionsInSection,
} from "./instrument-core";
