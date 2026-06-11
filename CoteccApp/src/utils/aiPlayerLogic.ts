import {cardIsGreater} from './cardsLogic';
import {Suit} from './constants';
import {Card, Move, PlayerHand, Turn} from '../types';

const MAX_RANK = 11;

const strongest = (cards: Card[]): Card =>
  cards.reduce((c1, c2) => (cardIsGreater(c1, c2) ? c1 : c2));

const weakest = (cards: Card[]): Card =>
  cards.reduce((c1, c2) => (cardIsGreater(c1, c2) ? c2 : c1));

const seenCards = (currentTurn: Turn, pastTurns: Turn[]): Card[] => [
  ...pastTurns.flatMap(turn => turn.moves.map(move => move.card)),
  ...currentTurn.moves.map(move => move.card),
];

// true while an opponent may still hold a higher card of the same suit
const canBeBeaten = (card: Card, hand: PlayerHand, seen: Card[]): boolean => {
  for (let rank = card.rank + 1; rank <= MAX_RANK; rank++) {
    const accountedFor =
      hand.cardsBySuit[card.suit].some(c => c.rank === rank) ||
      seen.some(c => c.suit === card.suit && c.rank === rank);
    if (!accountedFor) {
      return true;
    }
  }
  return false;
};

// highest points, then highest rank; tie-break towards emptying short suits
const mostDangerous = (hand: PlayerHand): Card =>
  hand.cards.reduce((best, card) => {
    if (card.points !== best.points) {
      return card.points > best.points ? card : best;
    }
    if (card.rank !== best.rank) {
      return card.rank > best.rank ? card : best;
    }
    return hand.cardsBySuit[card.suit].length <
      hand.cardsBySuit[best.suit].length
      ? card
      : best;
  });

// The goal of the game is avoiding to take points, so the AI always
// tries to lose the turn and sheds its dangerous cards when it can
// not win or is winning anyway.
export const aiMoveToPlay = (
  hand: PlayerHand,
  currentTurn: Turn,
  pastTurns: Turn[],
  playersInRound?: number,
): Move => {
  if (!hand.cards.length) {
    throw Error(`AI player ${hand.playerID} does not own any card`);
  }

  const play = (card: Card, rule: string): Move => {
    console.log(`Player ${hand.playerID}: ${rule}`);
    return {card, playerID: hand.playerID};
  };

  // RULE-1 a single card is a forced move
  if (hand.cards.length === 1) {
    return play(hand.cards[0], 'RULE-1 single card');
  }

  const currentSuit: Suit | null = currentTurn.suit;
  const eligible: Card[] = currentSuit ? hand.cardsBySuit[currentSuit] : [];

  // RULE-2 must respond with the led suit
  if (currentSuit && eligible.length) {
    // 2.a a single eligible card is a forced move
    if (eligible.length === 1) {
      return play(eligible[0], 'RULE-2.A only one eligible card');
    }

    const highestPlayed = currentTurn.highestCard;
    const losing = highestPlayed
      ? eligible.filter(card => cardIsGreater(highestPlayed, card))
      : [];
    // 2.b duck with the highest card that still loses the turn
    if (losing.length) {
      return play(strongest(losing), 'RULE-2.B highest losing card');
    }

    // 2.c every eligible card wins the turn so far: when last to act the
    // turn is taken regardless, so shed the strongest card; otherwise
    // play the weakest and hope a later player goes higher
    const isLastToAct =
      playersInRound != null && currentTurn.moves.length === playersInRound - 1;
    return isLastToAct
      ? play(strongest(eligible), 'RULE-2.C dump strongest, turn is taken')
      : play(weakest(eligible), 'RULE-2.C weakest winning card');
  }

  // RULE-3 leading the turn
  if (!currentSuit) {
    const seen = seenCards(currentTurn, pastTurns);

    // 3.a on the first trick, lead the highest of the fewest suit to build
    // a void, as long as it carries no points and can still be beaten
    if (!pastTurns.length) {
      const fewestSuit = Object.entries(hand.cardsBySuit)
        .filter(([_, cards]) => cards.length > 0)
        .reduce((a, b) => (a[1].length <= b[1].length ? a : b))[0] as Suit;
      const highestOfFewest = strongest(hand.cardsBySuit[fewestSuit]);
      if (
        highestOfFewest.points === 0 &&
        canBeBeaten(highestOfFewest, hand, seen)
      ) {
        return play(highestOfFewest, 'RULE-3.A highest of fewest suit');
      }
    }

    // 3.b lead the weakest card an opponent can still beat
    const beatable = hand.cards.filter(card => canBeBeaten(card, hand, seen));
    return play(
      weakest(beatable.length ? beatable : hand.cards),
      'RULE-3.B weakest beatable lead',
    );
  }

  // RULE-4 void in the led suit: the turn can not be won, so this is a
  // free chance to discard the most dangerous card
  return play(mostDangerous(hand), 'RULE-4 most dangerous discard');
};
