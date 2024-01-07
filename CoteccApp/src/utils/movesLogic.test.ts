import {Suit} from './constants';
import {calculateScore, validateMove, ValidationError} from './movesLogic';
import {newTurn} from './turnLogic';
import {newPlayerHand} from '../__tests__/playerHandTestFixture';
import {Card, Turn} from '../types';

describe('calculateScore', () => {
  it('returns 0 when no  move', () => {
    expect(calculateScore([])).toEqual(0);
  });

  it('returns the sum of points', () => {
    const moves = [
      {card: {suit: Suit.Ori, rank: 5, points: 0}, playerID: 1},
      {card: {suit: Suit.Ori, rank: 8, points: 2}, playerID: 2},
    ];

    expect(calculateScore(moves)).toEqual(2);
  });
});

describe('validateMove', () => {
  let turn: Turn;
  let playedCard: Card;

  beforeEach(() => {
    turn = newTurn(1);
    playedCard = {suit: Suit.Ori, rank: 8, points: 2};
  });

  it('passes if player plays at their turn and suit is not set', () => {
    const hand = newPlayerHand({playerID: 1, cards: [playedCard]});

    expect(() => {
      validateMove(turn, hand, playedCard);
    }).not.toThrow(ValidationError);
  });

  it('passes if player plays at their turn and follows the suit', () => {
    const hand = newPlayerHand({playerID: 1, cards: [playedCard]});
    turn.suit = playedCard.suit;

    expect(() => {
      validateMove(turn, hand, playedCard);
    }).not.toThrow(ValidationError);
  });

  it('passes if player plays at their turn and does not own the suit', () => {
    const hand = newPlayerHand({playerID: 1, cards: [playedCard]});
    turn.suit = [Suit.Bastoni, Suit.Coppe].find(s => s !== playedCard.suit)!;

    expect(() => {
      validateMove(turn, hand, playedCard);
    }).not.toThrow(ValidationError);
  });

  it('throws ValidationError when player turn validation fails', () => {
    const hand = newPlayerHand({playerID: 2, cards: [playedCard]});

    expect(() => {
      validateMove(turn, hand, playedCard);
    }).toThrow(ValidationError);
  });

  it('throws ValidationError when player owns the suit set and does not respect it', () => {
    const hand = newPlayerHand({
      playerID: 1,
      cards: [
        playedCard,
        {suit: Suit.Bastoni, rank: 8, points: 2},
        {suit: Suit.Coppe, rank: 8, points: 2},
        {suit: Suit.Spade, rank: 8, points: 2},
      ],
    });

    expect(playedCard.suit).not.toEqual(Suit.Coppe);

    turn.suit = Suit.Coppe;

    expect(() => {
      validateMove(turn, hand, playedCard);
    }).toThrow(ValidationError);
  });
});
