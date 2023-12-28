import {newRound} from './roundLogic';

const playerOne = {ID: 0, name: 'foo', hand: [], lifeCount: 3, isHuman: true};

describe('newRound', () => {
  it('creates a new round state where only active players are present', () => {
    const round = newRound(1, playerOne.ID);
    // TODO: update after introducing player hand in the round state
    expect(round.initialPlayerID).toEqual(playerOne.ID);
  });
});
