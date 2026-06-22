import {applyMove} from './applyMove';
import {Player} from '../types';
import {Suit} from '../utils/constants';
import {newGame} from '../utils/gameLogic';
import {roundIsOver} from '../utils/roundLogic';

const players: Player[] = [
  {ID: 1, name: 'A', isHuman: true, lifeCount: 3},
  {ID: 2, name: 'B', isHuman: false, lifeCount: 3},
];

describe('applyMove', () => {
  it('returns ok:true and applies a legal move', () => {
    const state = newGame(players, 1, 3);
    const hand = state.currentRound.players.find(h => h.playerID === 1)!;
    const card = hand.cards[0];
    const res = applyMove(state, 1, {suit: card.suit, rank: card.rank});
    expect(res.ok).toBe(true);
    expect(hand.cards.length).toBe(6); // started with 7 (2 players)
  });

  it("rejects a move when it is not the player's turn", () => {
    const state = newGame(players, 1, 3); // player 1 to move
    const hand = state.currentRound.players.find(h => h.playerID === 2)!;
    const card = hand.cards[0];
    const res = applyMove(state, 2, {suit: card.suit, rank: card.rank});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NOT_YOUR_TURN');
  });

  it('rejects a card the player does not hold', () => {
    const state = newGame(players, 1, 3);
    const hand = state.currentRound.players.find(h => h.playerID === 1)!;
    const owned = new Set(hand.cards.map(c => `${c.suit}-${c.rank}`));
    let missing = {suit: Suit.Ori, rank: 2};
    for (const suit of Object.values(Suit)) {
      for (let rank = 2; rank <= 11; rank++) {
        if (!owned.has(`${suit}-${rank}`)) {
          missing = {suit, rank};
        }
      }
    }
    const res = applyMove(state, 1, missing);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('CARD_NOT_IN_HAND');
  });
});

describe('applyMove — remaining branches', () => {
  it('rejects when the round is over (ROUND_NOT_ACTIVE)', () => {
    const state = newGame(players, 1, 3);
    // empty every hand so roundIsOver() is true
    state.currentRound.players.forEach(h => {
      h.cards = [];
    });
    const res = applyMove(state, 1, {suit: Suit.Ori, rank: 7});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('ROUND_NOT_ACTIVE');
  });

  it('rejects an unknown seat (no hand in round) as NOT_YOUR_TURN', () => {
    const state = newGame(players, 1, 3);
    const res = applyMove(state, 999, {suit: Suit.Ori, rank: 7});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NOT_YOUR_TURN');
  });

  it('rejects an off-suit move when the lead suit is held (MUST_FOLLOW_SUIT)', () => {
    const state = newGame(players, 1, 3);
    const round = state.currentRound;
    const p1 = round.players.find(h => h.playerID === 1)!;
    const p2 = round.players.find(h => h.playerID === 2)!;
    // Force a known board: p1 leads bastoni; p2 holds bastoni AND a coppe card.
    const lead = {suit: Suit.Bastoni, rank: 4, points: 0};
    const p2Follow = {suit: Suit.Bastoni, rank: 5, points: 0};
    const p2Off = {suit: Suit.Coppe, rank: 6, points: 0};
    p1.cards = [lead];
    p1.cardsBySuit = {
      [Suit.Bastoni]: [lead],
      [Suit.Spade]: [],
      [Suit.Coppe]: [],
      [Suit.Ori]: [],
    };
    p2.cards = [p2Follow, p2Off];
    p2.cardsBySuit = {
      [Suit.Bastoni]: [p2Follow],
      [Suit.Spade]: [],
      [Suit.Coppe]: [p2Off],
      [Suit.Ori]: [],
    };
    // p1 leads
    expect(applyMove(state, 1, {suit: Suit.Bastoni, rank: 4}).ok).toBe(true);
    // now p2 to move; playing coppe while holding bastoni is illegal
    const res = applyMove(state, 2, {suit: Suit.Coppe, rank: 6});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('MUST_FOLLOW_SUIT');
  });
});

describe('applyMove — full round', () => {
  it('plays a full round to completion (covers the endRound callback)', () => {
    const state = newGame(players, 1, 3);
    let guard = 0;
    while (!roundIsOver(state.currentRound) && guard++ < 100) {
      const cur = state.currentRound.currentTurn.currentPlayerID;
      const hand = state.currentRound.players.find(h => h.playerID === cur)!;
      const lead = state.currentRound.currentTurn.suit;
      const inSuit = lead ? hand.cards.filter(c => c.suit === lead) : [];
      const card = (inSuit.length > 0 ? inSuit : hand.cards)[0];
      const res = applyMove(state, cur, {suit: card.suit, rank: card.rank});
      expect(res.ok).toBe(true);
    }
    expect(roundIsOver(state.currentRound)).toBe(true);
    expect(state.currentRound.result).toBeDefined(); // endRound ran
  });
});
