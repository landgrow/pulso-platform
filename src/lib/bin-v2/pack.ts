import "server-only";

import { BIN_GATE_CATALOGS, BIN_GATILHOS } from "./catalog";
import type { BinGateCatalog, BinTriggerRule } from "./catalog";
import { BIN_INSTRUMENTS, packIdFor } from "./instrument";
import type { BinRoute } from "./route";
import type { BinInstrument, BinPackId } from "./types";

export interface BinPack {
  id: BinPackId;
  instrument: BinInstrument;
  gatilhos: BinTriggerRule[];
  gates: BinGateCatalog;
}

const PACKS: Record<BinPackId, BinPack> = {
  servicos: {
    id: "servicos",
    instrument: BIN_INSTRUMENTS.servicos,
    gatilhos: BIN_GATILHOS.servicos,
    gates: BIN_GATE_CATALOGS.servicos,
  },
  varejo: {
    id: "varejo",
    instrument: BIN_INSTRUMENTS.varejo,
    gatilhos: BIN_GATILHOS.varejo,
    gates: BIN_GATE_CATALOGS.varejo,
  },
  industria: {
    id: "industria",
    instrument: BIN_INSTRUMENTS.industria,
    gatilhos: BIN_GATILHOS.industria,
    gates: BIN_GATE_CATALOGS.industria,
  },
};

export function packFor(route: BinRoute | null | undefined): BinPack {
  return PACKS[packIdFor(route)];
}

export function packById(id: BinPackId): BinPack {
  return PACKS[id];
}
