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
