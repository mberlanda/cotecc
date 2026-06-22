import {Seat} from './seat';
import {projectStateForSeat} from './seatView';
import {applyMove} from '../engine/applyMove';
import {Player} from '../types';
import {newGame} from '../utils/gameLogic';

const mkPlayers = (n: number): Player[] =>
  Array.from({length: n}, (_, i) => ({
    ID: i + 1,
    name: `P${i + 1}`,
    isHuman: i === 0,
    lifeCount: 3,
  }));

const mkSeats = (players: Player[]): Seat[] =>
  players.map((p, i) => ({
    seatId: `s${p.ID}`,
    playerId: p.ID,
    displayName: p.name,
    controller: i === 0 ? 'local' : 'remote',
    connection: 'connected',
    isHostSeat: i === 0,
  }));

// Walk any parsed JSON value and collect every {suit, rank} pair as "suit-rank".
// Structural (not substring): immune to key ordering / whitespace.
const collectCardRefs = (
  node: unknown,
  acc: Set<string> = new Set(),
): Set<string> => {
  if (Array.isArray(node)) {
    node.forEach(n => collectCardRefs(n, acc));
  } else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o.suit === 'string' && typeof o.rank === 'number') {
      acc.add(`${o.suit}-${o.rank}`);
    }
    Object.values(o).forEach(v => collectCardRefs(v, acc));
  }
  return acc;
};

describe('projectStateForSeat — redaction oracle', () => {
  it.each([2, 3, 4, 5, 6])(
    'for a %i-seat game, a seat view contains only the local hand',
    n => {
      const players = mkPlayers(n);
      const state = newGame(players, 1, 3);
      const seats = mkSeats(players);

      for (const seat of seats) {
        const view = projectStateForSeat(state, seats, seat.seatId);

        const localHand = state.currentRound.players.find(
          h => h.playerID === seat.playerId,
        )!;
        expect(view.localHand.length).toBe(localHand.cards.length);

        const allowed = new Set(
          [...localHand.cards, ...view.currentTrick.map(t => t.card)].map(
            c => `${c.suit}-${c.rank}`,
          ),
        );
        const found = collectCardRefs(JSON.parse(JSON.stringify(view)));
        for (const ref of found) {
          expect(allowed.has(ref)).toBe(true);
        }
      }
    },
  );

  it('never serializes dealSeed / RNG / full GameState markers', () => {
    const players = mkPlayers(4);
    const state = newGame(players, 1, 3);
    const seats = mkSeats(players);
    const serialized = JSON.stringify(projectStateForSeat(state, seats, 's1'));
    expect(serialized).not.toContain('dealSeed');
    expect(serialized).not.toContain('cardsBySuit');
    expect(serialized).not.toContain('pastRounds');
    expect(serialized).not.toContain('maxLifeCount');
  });

  it("legalActions is empty when it is not the local seat's turn", () => {
    const players = mkPlayers(3);
    const state = newGame(players, 1, 3); // seat s1 (player 1) to move
    const seats = mkSeats(players);
    const notMyTurn = projectStateForSeat(state, seats, 's2');
    expect(notMyTurn.legalActions).toEqual([]);
    const myTurn = projectStateForSeat(state, seats, 's1');
    expect(myTurn.phase).toBe('playing');
    expect(myTurn.legalActions.length).toBeGreaterThan(0);
  });

  it('fuzz: after random legal moves, no view leaks a foreign card (mid-trick)', () => {
    const players = mkPlayers(4);
    const state = newGame(players, 1, 3);
    const seats = mkSeats(players);
    for (let i = 0; i < 3; i++) {
      const cur = state.currentRound.currentTurn.currentPlayerID;
      const v = projectStateForSeat(state, seats, `s${cur}`);
      if (v.legalActions.length === 0) break;
      applyMove(state, cur, v.legalActions[0]);
    }
    for (const seat of seats) {
      const v = projectStateForSeat(state, seats, seat.seatId);
      const localHand = state.currentRound.players.find(
        h => h.playerID === seat.playerId,
      )!;
      const allowed = new Set(
        [...localHand.cards, ...v.currentTrick.map(t => t.card)].map(
          c => `${c.suit}-${c.rank}`,
        ),
      );
      for (const ref of collectCardRefs(JSON.parse(JSON.stringify(v)))) {
        expect(allowed.has(ref)).toBe(true);
      }
    }
  });
});
