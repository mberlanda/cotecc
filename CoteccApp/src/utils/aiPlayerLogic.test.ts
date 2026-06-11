import {beforeEach, describe, expect, it} from '@jest/globals';

import {aiMoveToPlay} from './aiPlayerLogic';
import {Suit} from './constants';
import {dealTestCards, newPlayerHand} from '../__tests__/playerHandTestFixture';
import {PlayerHand, Turn} from '../types';

const card_3ori = {suit: Suit.Ori, rank: 3, points: 0};
const card_5ori = {suit: Suit.Ori, rank: 5, points: 0};
const card_6ori = {suit: Suit.Ori, rank: 6, points: 0};
const card_7ori = {suit: Suit.Ori, rank: 7, points: 0};
const card_11ori = {suit: Suit.Ori, rank: 11, points: 6};
const card_2bastoni = {suit: Suit.Bastoni, rank: 2, points: 0};
const card_3bastoni = {suit: Suit.Bastoni, rank: 3, points: 0};
const card_4bastoni = {suit: Suit.Bastoni, rank: 4, points: 0};
const card_5bastoni = {suit: Suit.Bastoni, rank: 5, points: 0};
const card_6bastoni = {suit: Suit.Bastoni, rank: 6, points: 0};
const card_7bastoni = {suit: Suit.Bastoni, rank: 7, points: 0};
const card_8bastoni = {suit: Suit.Bastoni, rank: 8, points: 3};
const card_9bastoni = {suit: Suit.Bastoni, rank: 9, points: 4};
const card_10bastoni = {suit: Suit.Bastoni, rank: 10, points: 5};
const card_11bastoni = {suit: Suit.Bastoni, rank: 11, points: 6};
const card_2coppe = {suit: Suit.Coppe, rank: 2, points: 0};
const card_7coppe = {suit: Suit.Coppe, rank: 7, points: 0};
const card_8coppe = {suit: Suit.Coppe, rank: 8, points: 3};

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
    dealTestCards([card_7ori], player);
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
    dealTestCards([card_7ori, card_3bastoni], player);
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
    dealTestCards([card_7ori, card_3bastoni, card_9bastoni], player);
    expect(aiMoveToPlay(player, currentTurn2B, [])).toEqual({
      card: card_9bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-2.B ducks with the highest losing card when holding a mix', () => {
    const currentTurnMix = {
      ...currentTurn,
      highestCard: card_10bastoni,
      moves: [{card: card_10bastoni, playerID: 10}],
      suit: Suit.Bastoni,
    };
    dealTestCards([card_3bastoni, card_9bastoni, card_11bastoni], player);
    expect(aiMoveToPlay(player, currentTurnMix, [])).toEqual({
      card: card_9bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-2.B sheds the only losing card of the led suit', () => {
    const currentTurnRandSuit = {
      ...currentTurn,
      highestCard: card_8bastoni,
      moves: [
        {card: card_8bastoni, playerID: 10},
        {card: card_3ori, playerID: 20},
      ],
      suit: Suit.Bastoni,
    };
    dealTestCards([card_7ori, card_3bastoni, card_11bastoni], player);
    expect(aiMoveToPlay(player, currentTurnRandSuit, [])).toEqual({
      card: card_3bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-2.C plays the weakest winning card when not last to act', () => {
    const currentTurn2C = {
      ...currentTurn,
      highestCard: card_8bastoni,
      moves: [{card: card_8bastoni, playerID: 10}],
      suit: Suit.Bastoni,
    };
    dealTestCards([card_9bastoni, card_11bastoni], player);
    expect(aiMoveToPlay(player, currentTurn2C, [], 5)).toEqual({
      card: card_9bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-2.C defaults to the weakest winning card without playersInRound', () => {
    const currentTurn2C = {
      ...currentTurn,
      highestCard: card_8bastoni,
      moves: [{card: card_8bastoni, playerID: 10}],
      suit: Suit.Bastoni,
    };
    dealTestCards([card_9bastoni, card_11bastoni], player);
    expect(aiMoveToPlay(player, currentTurn2C, [])).toEqual({
      card: card_9bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-2.C dumps the strongest card when last to act and forced to win', () => {
    const currentTurnLast = {
      ...currentTurn,
      highestCard: card_8bastoni,
      moves: [
        {card: card_8bastoni, playerID: 10},
        {card: card_3ori, playerID: 15},
        {card: card_2coppe, playerID: 20},
        {card: card_5ori, playerID: 25},
      ],
      suit: Suit.Bastoni,
    };
    dealTestCards([card_9bastoni, card_11bastoni], player);
    expect(aiMoveToPlay(player, currentTurnLast, [], 5)).toEqual({
      card: card_11bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-3.A first move no previous turn returns highest of the fewest suit', () => {
    const currentTurn3A = {
      ...currentTurn,
      suit: null,
    };
    dealTestCards(
      [card_7ori, card_3bastoni, card_11bastoni, card_5bastoni],
      player,
    );
    expect(aiMoveToPlay(player, currentTurn3A, [])).toEqual({
      card: card_7ori,
      playerID: player.playerID,
    });
  });

  it('RULE-3.A does not lead a point card to build a void', () => {
    const currentTurn3A = {
      ...currentTurn,
      suit: null,
    };
    dealTestCards(
      [card_11ori, card_3bastoni, card_5bastoni, card_7coppe, card_8coppe],
      player,
    );
    expect(aiMoveToPlay(player, currentTurn3A, [])).toEqual({
      card: card_3bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-3.B mid-game lead plays the weakest beatable card', () => {
    dealTestCards([card_7ori, card_3bastoni, card_10bastoni], player);
    expect(aiMoveToPlay(player, currentTurn, [pastTurn])).toEqual({
      card: card_3bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-3.B mid-game lead avoids cards that cannot be beaten anymore', () => {
    const bastoniRunDown: Turn[] = [
      {
        currentPlayerID: 0,
        highestCard: card_11bastoni,
        moves: [
          {card: card_3bastoni, playerID: 5},
          {card: card_4bastoni, playerID: 10},
          {card: card_5bastoni, playerID: 15},
          {card: card_6bastoni, playerID: 20},
          {card: card_11bastoni, playerID: 25},
        ],
        suit: Suit.Bastoni,
        winnerID: 25,
      },
      {
        currentPlayerID: 25,
        highestCard: card_10bastoni,
        moves: [
          {card: card_7bastoni, playerID: 5},
          {card: card_8bastoni, playerID: 10},
          {card: card_9bastoni, playerID: 15},
          {card: card_10bastoni, playerID: 20},
          {card: card_2coppe, playerID: 25},
        ],
        suit: Suit.Bastoni,
        winnerID: 20,
      },
    ];
    // every bastoni above the 2 has been played: leading it would win the turn
    dealTestCards([card_2bastoni, card_5ori, card_6ori], player);
    expect(aiMoveToPlay(player, currentTurn, bastoniRunDown)).toEqual({
      card: card_5ori,
      playerID: player.playerID,
    });
  });

  it('RULE-4 discards the most dangerous card when void in the led suit', () => {
    const currentTurnVoid = {
      ...currentTurn,
      highestCard: card_7ori,
      moves: [
        {card: card_7ori, playerID: 10},
        {card: card_3ori, playerID: 20},
      ],
      suit: Suit.Ori,
    };
    dealTestCards([card_3bastoni, card_10bastoni], player);
    expect(aiMoveToPlay(player, currentTurnVoid, [pastTurn])).toEqual({
      card: card_10bastoni,
      playerID: player.playerID,
    });
  });

  it('RULE-4 dumps points even on the first trick when void', () => {
    const currentTurnVoid = {
      ...currentTurn,
      highestCard: card_7coppe,
      moves: [{card: card_7coppe, playerID: 10}],
      suit: Suit.Coppe,
    };
    dealTestCards([card_7ori, card_3bastoni, card_11bastoni], player);
    expect(aiMoveToPlay(player, currentTurnVoid, [])).toEqual({
      card: card_11bastoni,
      playerID: player.playerID,
    });
  });
});
