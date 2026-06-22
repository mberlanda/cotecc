import {applyMove} from './applyMove';
import {Player} from '../types';
import {Suit} from '../utils/constants';
import {newGame} from '../utils/gameLogic';

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
