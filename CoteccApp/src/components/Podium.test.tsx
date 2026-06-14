import React from 'react';

import {describe, expect, it} from '@jest/globals';
import {render} from '@testing-library/react-native';

import Podium from './Podium';
import {Player} from '../types';

const standings: Player[] = [
  {ID: 2, name: 'Carla', lifeCount: 2, isHuman: false},
  {ID: 1, name: 'Bruno', lifeCount: 0, isHuman: false},
  {ID: 0, name: 'Mauro', lifeCount: 0, isHuman: true},
  {ID: 3, name: 'Dora', lifeCount: 0, isHuman: false},
];

describe('Podium', () => {
  it('shows the title and the top three players with medals', () => {
    const {getByText} = render(<Podium standings={standings} title="Game Over" />);

    expect(getByText('Game Over')).toBeTruthy();
    expect(getByText('🥇 Carla')).toBeTruthy();
    expect(getByText('🥈 Bruno')).toBeTruthy();
    expect(getByText('🥉 Mauro')).toBeTruthy();
  });

  it('shows at most three players, even when more are provided', () => {
    const {queryByText} = render(<Podium standings={standings} title="Game Over" />);

    expect(queryByText(/Dora/)).toBeNull();
  });

  it('renders only the available players when fewer than three', () => {
    const {getByText, queryByText} = render(
      <Podium standings={standings.slice(0, 2)} title="Game Over" />,
    );

    expect(getByText('🥇 Carla')).toBeTruthy();
    expect(getByText('🥈 Bruno')).toBeTruthy();
    expect(queryByText(/🥉/)).toBeNull();
  });

  it('marks the human on the podium when they finish in the top three', () => {
    // Mauro (human) is 3rd here.
    const {getByText, queryByText} = render(
      <Podium
        standings={standings.slice(0, 3)}
        title="Game Over"
        youLabel="(You)"
        positionLabel="Your position:"
      />,
    );

    expect(getByText('🥉 Mauro (You)')).toBeTruthy();
    // No separate position line needed when the human is on the podium.
    expect(queryByText(/Your position:/)).toBeNull();
  });

  it('shows the human position as text when they finish outside the top three', () => {
    // Full standings: human (Mauro) is 3rd here, so move them to 4th.
    const standingsHumanLast: Player[] = [
      {ID: 2, name: 'Carla', lifeCount: 2, isHuman: false},
      {ID: 1, name: 'Bruno', lifeCount: 0, isHuman: false},
      {ID: 3, name: 'Dora', lifeCount: 0, isHuman: false},
      {ID: 0, name: 'Mauro', lifeCount: 0, isHuman: true},
    ];
    const {getByText, queryByText} = render(
      <Podium
        standings={standingsHumanLast}
        title="Game Over"
        youLabel="(You)"
        positionLabel="Your position:"
      />,
    );

    expect(getByText('🥇 Carla')).toBeTruthy();
    expect(getByText('🥉 Dora')).toBeTruthy();
    expect(queryByText(/Mauro/)).toBeNull(); // not on the podium
    expect(getByText('Your position: 4')).toBeTruthy();
  });

  it('reports the human actual finishing position (e.g. 5th in a 6-player game)', () => {
    const sixPlayers: Player[] = [
      {ID: 5, name: 'Eve', lifeCount: 3, isHuman: false}, // 1st
      {ID: 4, name: 'Dan', lifeCount: 0, isHuman: false}, // 2nd
      {ID: 3, name: 'Cleo', lifeCount: 0, isHuman: false}, // 3rd
      {ID: 2, name: 'Bob', lifeCount: 0, isHuman: false}, // 4th
      {ID: 0, name: 'Mauro', lifeCount: 0, isHuman: true}, // 5th (human)
      {ID: 1, name: 'Ann', lifeCount: 0, isHuman: false}, // 6th
    ];
    const {getByText} = render(
      <Podium
        standings={sixPlayers}
        title="Game Over"
        youLabel="(You)"
        positionLabel="Your position:"
      />,
    );

    expect(getByText('Your position: 5')).toBeTruthy();
  });
});
