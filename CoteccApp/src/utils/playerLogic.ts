import {Player} from '../types';

export const findPlayerById = (players: Player[], playerID: number): Player => {
  const player = players.find(p => p.ID === playerID);
  if (!player) {
    throw RangeError(`PlayerID ${playerID} out of range`);
  }
  return player;
};

export const nextPlayerID = (players: Player[], playerID: number): number => {
  const playersCount = players.length;
  const currentPlayerIndex = players.findIndex(p => p.ID === playerID);
  return players[(currentPlayerIndex + 1) % playersCount].ID;
};

const generatAiPlayers = (lifeCount: number, count: number): Player[] =>
  [
    {ID: 1, name: 'bar', lifeCount, isHuman: false},
    {ID: 2, name: 'baz', lifeCount, isHuman: false},
    {ID: 3, name: 'baz', lifeCount, isHuman: false},
    {ID: 4, name: 'baz', lifeCount, isHuman: false},
  ].slice(0, count);

export const generatePlayers = (
  humanName: string,
  numberOfLifes: number,
  numberOfPlayers: number,
): Player[] => {
  const human = {
    ID: 0,
    name: humanName,
    lifeCount: numberOfLifes,
    isHuman: true,
  };
  const aiPlayersCount = Math.min(numberOfPlayers, 4);

  return [human, ...generatAiPlayers(numberOfLifes, aiPlayersCount)];
};
