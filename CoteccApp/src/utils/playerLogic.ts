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

const placeholderPlayers: Player[] = [
  {ID: 1, name: 'bar', hand: [], boleCount: 0, isHuman: false},
  {ID: 2, name: 'baz', hand: [], boleCount: 0, isHuman: false},
  {ID: 3, name: 'baz', hand: [], boleCount: 0, isHuman: false},
  {ID: 4, name: 'baz', hand: [], boleCount: 0, isHuman: false},
];

export const generatePlayers = (
  humanName: string,
  numberOfPlayers: number,
): Player[] => {
  const human = {ID: 0, name: humanName, hand: [], boleCount: 0, isHuman: true};
  const aiPlayers = Math.min(numberOfPlayers, 4);

  return [human, ...placeholderPlayers.slice(0, aiPlayers)];
};
