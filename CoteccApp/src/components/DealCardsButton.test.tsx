import React from 'react';

import {beforeEach, describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';

import DealCardsButton from './DealCardsButton';
import {GameState, Player} from '../types';
import {newGame} from '../utils/gameLogic';
import {newTurn} from '../utils/turnLogic';

describe('DealCardsButton', () => {
  let players: Player[];

  beforeEach(() => {
    players = [
      {ID: 0, name: 'foo', hand: [], lifeCount: 3, isHuman: true},
      {ID: 1, name: 'bar', hand: [], lifeCount: 3, isHuman: false},
      {ID: 2, name: 'baz', hand: [], lifeCount: 3, isHuman: false},
    ];
  });

  it('does not render when players have card', () => {
    const gameState = newGame(players, players[0].ID, 4);
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
      currentRound: {
        ID: 123,
        initialPlayerID: players[0].ID,
        currentTurn: newTurn(players[0].ID),
        pastTurns: [],
      },
      pastRounds: [],
      scores: {},
      maxLifeCount: 3,
    };
    const tree = renderer
      .create(<DealCardsButton state={endRoundState} doDealCards={() => {}} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
