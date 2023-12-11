import React from 'react';

import {beforeEach, describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';

import DealCardsButton from './DealCardsButton';
import {GameState, Player} from '../types';
import {newRound, newTurn} from '../utils/gameLogic';

describe('DealCardsButton', () => {
  let players: Player[];

  beforeEach(() => {
    players = [
      {ID: 0, name: 'foo', hand: [], boleCount: 0},
      {ID: 1, name: 'bar', hand: [], boleCount: 0},
      {ID: 2, name: 'baz', hand: [], boleCount: 0},
    ];
  });

  it('does not render when players have card', () => {
    const gameState = newRound(players, players[0].ID);
    const tree = renderer
      .create(<DealCardsButton state={gameState} doDealCards={() => {}} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
  it('renders when end of round', () => {
    const endRoundState: GameState = {
      players: players,
      deck: [],
      initialPlayerID: players[0].ID,
      currentTurn: newTurn(players[0].ID),
      pastTurns: [],
      scores: {},
    };
    const tree = renderer
      .create(<DealCardsButton state={endRoundState} doDealCards={() => {}} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
