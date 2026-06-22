import {PlayerID, RoundOutcome, RoundResult} from '../types';

// Wire form of RoundResult: Set -> sorted array, everything JSON-safe.
export interface WireRoundResult {
  outcome: RoundOutcome;
  roundLosers: PlayerID[]; // sorted ascending
  winnerID?: PlayerID;
}

export const encodeRoundResult = (rr: RoundResult): WireRoundResult => {
  const wire: WireRoundResult = {
    outcome: rr.outcome,
    roundLosers: [...rr.roundLosers].sort((a, b) => a - b),
  };
  if (rr.winnerID !== undefined) {
    wire.winnerID = rr.winnerID;
  }
  return wire;
};

export const decodeRoundResult = (w: WireRoundResult): RoundResult => {
  const rr: RoundResult = {
    outcome: w.outcome,
    roundLosers: new Set(w.roundLosers),
  };
  if (w.winnerID !== undefined) {
    rr.winnerID = w.winnerID;
  }
  return rr;
};

// scoresMap has numeric keys ({[playerID: number]: number}). JSON stringifies object
// keys to strings; this helper normalises them back to numbers on decode.
export type WireScoresMap = {[playerID: string]: number};

export const encodeScoresMap = (m: {
  [playerID: PlayerID]: number;
}): WireScoresMap => ({...m});

export const decodeScoresMap = (w: WireScoresMap): {
  [playerID: PlayerID]: number;
} => {
  const out: {[playerID: PlayerID]: number} = {};
  for (const k of Object.keys(w)) {
    const id = Number(k);
    // Skip corrupt/non-numeric keys (untrusted input) rather than create a NaN key.
    if (!Number.isInteger(id)) {
      continue;
    }
    out[id] = w[k];
  }
  return out;
};
