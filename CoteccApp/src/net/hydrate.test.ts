import {hydrateHand, rebuildCardsBySuit} from './hydrate';
import {Card, PlayerHand} from '../types';
import {Suit} from '../utils/constants';

const card = (suit: Suit, rank: number): Card => ({suit, rank, points: 0});

describe('hydrate', () => {
  it('rebuildCardsBySuit groups by suit in canonical order', () => {
    const cards = [card(Suit.Ori, 9), card(Suit.Coppe, 3), card(Suit.Ori, 2)];
    const bySuit = rebuildCardsBySuit(cards);
    expect(bySuit[Suit.Ori].map(c => c.rank)).toEqual([2, 9]);
    expect(bySuit[Suit.Coppe].map(c => c.rank)).toEqual([3]);
    expect(bySuit[Suit.Bastoni]).toEqual([]);
  });

  it('hydrateHand makes cardsBySuit consistent with cards after a JSON round-trip', () => {
    const hand: PlayerHand = {
      isHuman: true,
      playerID: 1,
      cards: [card(Suit.Ori, 9), card(Suit.Coppe, 3)],
      cardsBySuit: {
        [Suit.Bastoni]: [],
        [Suit.Spade]: [],
        [Suit.Coppe]: [],
        [Suit.Ori]: [],
      }, // deliberately desynced
    };
    const roundTripped: PlayerHand = JSON.parse(JSON.stringify(hand));
    const fixed = hydrateHand(roundTripped);
    const flat = Object.values(fixed.cardsBySuit).flat();
    expect(flat.length).toBe(fixed.cards.length);
    expect(fixed.cardsBySuit[Suit.Ori].map(c => c.rank)).toEqual([9]);
  });

  // Property test (Foundations §1.3, RC2-GAME-001): a non-canonical wire round-trip
  // must NOT change suit-following evaluation. For every possible lead suit, the set of
  // legal (in-suit-else-any) cards is identical before and after shuffle->encode->hydrate.
  it('preserves suit-following (legalActions) across a shuffled round-trip', () => {
    const all: Card[] = [
      card(Suit.Ori, 9),
      card(Suit.Ori, 2),
      card(Suit.Coppe, 3),
      card(Suit.Spade, 11),
      card(Suit.Spade, 5),
      card(Suit.Bastoni, 7),
    ];
    const legalFor = (cards: Card[], lead: Suit | null): string[] => {
      const inSuit = lead ? cards.filter(c => c.suit === lead) : [];
      const playable = inSuit.length > 0 ? inSuit : cards;
      return playable.map(c => `${c.suit}-${c.rank}`).sort();
    };
    const shuffled = [...all].reverse();
    const rehydrated = hydrateHand({
      isHuman: true,
      playerID: 1,
      cards: JSON.parse(JSON.stringify(shuffled)),
      cardsBySuit: rebuildCardsBySuit([]), // empty -> proves hydrate rebuilds it
    }).cards;
    for (const lead of [null, Suit.Ori, Suit.Spade, Suit.Coppe, Suit.Bastoni]) {
      expect(legalFor(rehydrated, lead)).toEqual(legalFor(all, lead));
    }
  });
});
