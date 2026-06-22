import {Card, newSuitMap, PlayerHand} from '../types';
import {sortCanonical} from '../utils/cardsLogic';
import {Suit} from '../utils/constants';

// Rebuild the suit-bucketed view from a flat card list, each bucket in canonical order.
export const rebuildCardsBySuit = (cards: Card[]): Record<Suit, Card[]> => {
  const bySuit = newSuitMap<Card[]>(() => []);
  for (const c of cards) {
    bySuit[c.suit].push(c);
  }
  for (const suit of Object.values(Suit)) {
    bySuit[suit] = sortCanonical(bySuit[suit]);
  }
  return bySuit;
};

// Return a hand with canonical cards + a cardsBySuit rebuilt from cards. Safe to call
// on a JSON-deserialized hand to restore the cards/cardsBySuit invariant.
export const hydrateHand = (hand: PlayerHand): PlayerHand => {
  const cards = sortCanonical(hand.cards);
  return {...hand, cards, cardsBySuit: rebuildCardsBySuit(cards)};
};
