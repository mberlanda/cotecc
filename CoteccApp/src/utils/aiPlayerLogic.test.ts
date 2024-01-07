import {beforeEach, describe, expect, it} from '@jest/globals';

import {aiMoveToPlay} from './aiPlayerLogic';
import {Suit} from './constants';
import {newPlayerHand} from '../__tests__/playerHandTestFixture';
import {Move, PlayerHand, Turn} from '../types';

const card_3ori = {suit: Suit.Ori, rank: 3, points: 0};
const card_7ori = {suit: Suit.Ori, rank: 7, points: 0};
const card_3bastoni = {suit: Suit.Bastoni, rank: 3, points: 0};
const card_5bastoni = {suit: Suit.Bastoni, rank: 5, points: 0};
const card_8bastoni = {suit: Suit.Bastoni, rank: 8, points: 3};
const card_9bastoni = {suit: Suit.Bastoni, rank: 9, points: 4};
const card_10bastoni = {suit: Suit.Bastoni, rank: 10, points: 5};
const card_11bastoni = {suit: Suit.Bastoni, rank: 11, points: 6};

const pastTurn: Turn = {
  currentPlayerID: 15,
  highestCard: card_11bastoni,
  moves: [
    {card: card_8bastoni, playerID: 0},
    {card: card_7ori, playerID: 5},
    {card: card_11bastoni, playerID: 10},
    {card: card_9bastoni, playerID: 15},
  ],
  suit: Suit.Bastoni,
  winnerID: 10,
};

describe('aiMoveToPlay', () => {
  let player: PlayerHand;
  let currentTurn: Turn;
  let pastTurns: Turn[];

  beforeEach(() => {
    player = newPlayerHand({playerID: 0});
    currentTurn = {
      currentPlayerID: player.playerID,
      moves: [],
      highestCard: null,
      suit: null,
      winnerID: null,
    };
    pastTurns = [];
  });

  it('throws an exception if the player has an empty hand', () => {
    expect(player.cards.length).toEqual(0);
    expect(() => {
      aiMoveToPlay(player, currentTurn, pastTurns);
    }).toThrowError();
  });

  it('RULE-1 if player has a single card, it would play it', () => {
    player.cards = [card_7ori];
    expect(aiMoveToPlay(player, currentTurn, [])).toEqual({
      card: card_7ori,
      playerID: player.playerID,
    });
  });

  it('RULE-2.A only one eligible card with same suit', () => {
    const currentTurn2A = {
      ...currentTurn,
      highestCard: card_10bastoni,
      moves: [{card: card_10bastoni, playerID: 10}],
      suit: Suit.Bastoni,
    };

    player.cards = [card_7ori, card_3bastoni];
    expect(aiMoveToPlay(player, currentTurn2A, [])).toEqual({
      card: card_3bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-2.B highest in rank lower than already played', () => {
    const currentTurn2B = {
      ...currentTurn,
      highestCard: card_11bastoni,
      moves: [
        {card: card_8bastoni, playerID: 10},
        {card: card_11bastoni, playerID: 15},
        {card: card_3ori, playerID: 20},
      ],
      suit: Suit.Bastoni,
    };

    player.cards = [card_7ori, card_3bastoni, card_9bastoni];
    expect(aiMoveToPlay(player, currentTurn2B, [])).toEqual({
      card: card_9bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-3.A first move no previous turn returns highest of the fewest suit', () => {
    const currentTurn3A = {
      ...currentTurn,
      suit: null,
    };
    player.cards = [card_7ori, card_3bastoni, card_11bastoni, card_5bastoni];
    expect(aiMoveToPlay(player, currentTurn3A, [])).toEqual({
      card: card_7ori,
      playerID: player.playerID,
    });
  });

  it('RULE-3.B not same suit no previous turn returns highest of the fewest suit', () => {
    const currentTurn3B = {
      ...currentTurn,
      suit: Suit.Coppe,
    };
    player.cards = [card_7ori, card_3bastoni, card_11bastoni];
    expect(aiMoveToPlay(player, currentTurn3B, [])).toEqual({
      card: card_7ori,
      playerID: player.playerID,
    });
  });

  it('TODO: RANDOM LOGIC TO BE IMPLEMENTED FOR 2+ SAME SUIT NOT GREATER', () => {
    // E.g. more than one card of the same suit, at least one higher than the highest
    const currentTurnRandSuit = {
      ...currentTurn,
      highestCard: card_8bastoni,
      moves: [
        {card: card_8bastoni, playerID: 10},
        {card: card_3ori, playerID: 20},
      ],
      suit: Suit.Bastoni,
    };
    player.cards = [card_7ori, card_3bastoni, card_11bastoni];
    const aiMove: Move = aiMoveToPlay(player, currentTurnRandSuit, []);

    expect(aiMove.playerID).toEqual(player.playerID);
    expect(aiMove.card.suit).toEqual(Suit.Bastoni);
  });

  it('TODO: RANDOM LOGIC TO BE IMPLEMENTED FOR 2+ NOT SUIT', () => {
    // E.g. more than one card of the same suit, at least one higher than the highest
    const currentTurnRandSuit = {
      ...currentTurn,
      highestCard: card_7ori,
      moves: [
        {card: card_7ori, playerID: 10},
        {card: card_3ori, playerID: 20},
      ],
      suit: Suit.Ori,
    };
    player.cards = [card_3bastoni, card_10bastoni];
    const aiMove: Move = aiMoveToPlay(player, currentTurnRandSuit, [pastTurn]);

    expect(aiMove.playerID).toEqual(player.playerID);
    expect(aiMove.card.suit).toEqual(Suit.Bastoni);
  });
});
