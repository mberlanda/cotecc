import {newRound} from './roundLogic';

const playerOne = {ID: 0, name: 'foo', hand: [], lifeCount: 3, isHuman: true};
const playerEliminated = {
  ID: 2,
  name: 'bar',
  hand: [],
  lifeCount: 0,
  isHuman: false,
};

describe('newRound', () => {
  it('creates a new round state where only active players are present', () => {
    const players = [playerOne, playerEliminated];
    const round = newRound(1, playerOne.ID, players);

    expect(round.initialPlayerID).toEqual(playerOne.ID);
    expect(round.players.length).toEqual(1);
  });
});
