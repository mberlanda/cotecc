import React from 'react';

import {describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';

import TableComponent from './TableComponent';
import {newPlayerHand} from '../__tests__/playerHandTestFixture';
import {Move, Player} from '../types';
import {Suit} from '../utils/constants';

const players: Player[] = [
  {ID: 0, name: 'Alice', lifeCount: 4, isHuman: true},
  {ID: 1, name: 'Bruno', lifeCount: 4, isHuman: false},
  {ID: 2, name: 'Clara', lifeCount: 4, isHuman: false},
  {ID: 3, name: 'Dino', lifeCount: 4, isHuman: false},
];
const hands = players.map(player =>
  newPlayerHand({
    playerID: player.ID,
    isHuman: player.isHuman,
    cards: [{suit: Suit.Ori, rank: 3, points: 0}],
  }),
);
const tableProps = {
  players,
  hands,
  currentPlayerID: 0,
  scoresMap: {0: 1, 1: 0, 2: 3, 3: 0},
  labels: {
    cards: 'cards',
    currentTrick: 'Current trick',
    waitingForLead: 'Waiting for the lead card',
  },
};

const makeTableProps = (playerCount: number) => {
  const generatedPlayers: Player[] = Array.from(
    {length: playerCount},
    (_, index) => ({
      ID: index,
      name: index === 0 ? 'Alice' : `Player ${index}`,
      lifeCount: 4,
      isHuman: index === 0,
    }),
  );
  return {
    players: generatedPlayers,
    hands: generatedPlayers.map(player =>
      newPlayerHand({
        playerID: player.ID,
        isHuman: player.isHuman,
        cards: [{suit: Suit.Ori, rank: 3, points: 0}],
      }),
    ),
    currentPlayerID: 0,
    scoresMap: {},
    labels: tableProps.labels,
  };
};

describe('TableComponent', () => {
  it('renders without exception when no move', () => {
    const tree = renderer
      .create(<TableComponent {...tableProps} moves={[]} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders without exception when moves provided', () => {
    const moves: Move[] = [
      {playerID: 1, card: {suit: Suit.Ori, rank: 3, points: 0}},
      {playerID: 2, card: {suit: Suit.Ori, rank: 8, points: 3}},
    ];
    const tree = renderer
      .create(<TableComponent {...tableProps} moves={moves} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it.each([2, 3, 4, 5, 6])(
    'renders the table layout for %i players',
    playerCount => {
      const tree = renderer
        .create(<TableComponent {...makeTableProps(playerCount)} moves={[]} />)
        .toJSON();

      expect(tree).toBeTruthy();
    },
  );
});
