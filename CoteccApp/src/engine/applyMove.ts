import {CardRef, GameState, PlayerID} from '../types';
import {endRound, makeMove, nextMove} from '../utils/gameLogic';
import {validateMove} from '../utils/movesLogic';
import {roundIsOver} from '../utils/roundLogic';

export type MoveRejectCode =
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_IN_HAND'
  | 'MUST_FOLLOW_SUIT'
  | 'ROUND_NOT_ACTIVE'
  | 'GAME_OVER';

export type MoveResult =
  | {ok: true}
  | {ok: false; code: MoveRejectCode; message: string};

// Network-facing wrapper around the in-place rules. Maps validation failures onto
// structured reject codes instead of console.log + silent return.
export const applyMove = (
  state: GameState,
  playerID: PlayerID,
  cardRef: CardRef,
): MoveResult => {
  const round = state.currentRound;
  if (roundIsOver(round)) {
    return {ok: false, code: 'ROUND_NOT_ACTIVE', message: 'Round is over'};
  }
  const hand = round.players.find(p => p.playerID === playerID);
  if (!hand) {
    return {ok: false, code: 'NOT_YOUR_TURN', message: 'No such seat in round'};
  }
  if (round.currentTurn.currentPlayerID !== playerID) {
    return {ok: false, code: 'NOT_YOUR_TURN', message: 'Not your turn'};
  }
  // Resolve the CardRef to the held card (value match). points come from the hand.
  const card = hand.cards.find(
    c => c.suit === cardRef.suit && c.rank === cardRef.rank,
  );
  if (!card) {
    return {ok: false, code: 'CARD_NOT_IN_HAND', message: 'Card not in hand'};
  }
  try {
    validateMove(round.currentTurn, hand, card);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Illegal move';
    // validateMove runs BOTH the turn rule and the suit rule. The turn is already
    // checked above, so in practice only the suit rule can fire here — but map
    // defensively by message instead of assuming, so a future caller that skips the
    // pre-check still gets the right code (validateSuit's message contains 'respect').
    const code: MoveRejectCode = /respect/i.test(msg)
      ? 'MUST_FOLLOW_SUIT'
      : 'NOT_YOUR_TURN';
    return {ok: false, code, message: msg};
  }
  makeMove(round.currentTurn, hand, card, () =>
    nextMove(round, hand, () => endRound(state)),
  );
  return {ok: true};
};
