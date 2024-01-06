import React from 'react';

import {beforeEach, describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';

import {StateDebugComponent} from './StateDebug';
import {GameState, Player} from '../types';
import {Suit} from '../utils/constants';
import {newGame} from '../utils/gameLogic';

const players: Player[] = [
  {ID: 0, name: 'foo', hand: [], lifeCount: 3, isHuman: true},
  {ID: 1, name: 'bar', hand: [], lifeCount: 3, isHuman: false},
  {ID: 2, name: 'baz', hand: [], lifeCount: 3, isHuman: false},
];

describe('StateDebug', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = newGame(players, players[0].ID, 4);
  });

  it('renders turn data in the initial state', () => {
    const tree = renderer
      .create(<StateDebugComponent state={gameState} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders turn data after the first turn', () => {
    gameState.players.forEach(player => {
      player.hand.pop();
    });

    gameState.currentRound.pastTurns.push({
      suit: Suit.Spade,
      highestCard: {suit: Suit.Spade, rank: 4, points: 0},
      moves: [
        {playerID: 0, card: {suit: Suit.Spade, rank: 4, points: 0}},
        {playerID: 1, card: {suit: Suit.Spade, rank: 8, points: 3}},
        {playerID: 2, card: {suit: Suit.Spade, rank: 9, points: 4}},
      ],
      currentPlayerID: 0,
      winnerID: 0,
    });
    const tree = renderer
      .create(<StateDebugComponent state={gameState} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
