import {Player, PlayerID, RoundResult} from '../types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const findPlayerById = (
  players: Player[],
  playerID: PlayerID,
): Player => {
  const player = players.find(p => p.ID === playerID);
  if (!player) {
    throw RangeError(`PlayerID ${playerID} out of range`);
  }
  return player;
};

// TODO: refactor to reflect the logic to keep in account only players
// alive
export const nextPlayerID = (
  players: Player[],
  playerID: PlayerID,
): PlayerID => {
  const playersCount = players.length;
  const currentPlayerIndex = players.findIndex(p => p.ID === playerID);
  return players[(currentPlayerIndex + 1) % playersCount].ID;
};

const placeholderPlayers = (maxLifeCount: number): Player[] => [
  {ID: 1, name: 'Bruno', lifeCount: maxLifeCount, isHuman: false},
  {ID: 2, name: 'Clara', lifeCount: maxLifeCount, isHuman: false},
  {ID: 3, name: 'Dino', lifeCount: maxLifeCount, isHuman: false},
  {ID: 4, name: 'Elena', lifeCount: maxLifeCount, isHuman: false},
  {ID: 5, name: 'Franco', lifeCount: maxLifeCount, isHuman: false},
];

export const generatePlayers = (
  humanName: string,
  totalPlayers: number,
  maxLifeCount: number,
): Player[] => {
  const human = {
    ID: 0,
    name: humanName,
    hand: [],
    lifeCount: maxLifeCount,
    isHuman: true,
  };
  const playerCount = Math.max(
    MIN_PLAYERS,
    Math.min(totalPlayers, MAX_PLAYERS),
  );
  const aiPlayers = playerCount - 1;

  return [human, ...placeholderPlayers(maxLifeCount).slice(0, aiPlayers)];
};

export const updateLivesCount = (
  players: Player[],
  roundOutcome: RoundResult,
  maxLifeCount: number,
): void => {
  for (let i = 0; i < players.length; i++) {
    const previousLifeCount = players[i].lifeCount;
    if (players[i].ID === roundOutcome.winnerID) {
      players[i].lifeCount = Math.min(previousLifeCount + 1, maxLifeCount);
    } else if (roundOutcome.roundLosers.has(players[i].ID)) {
      players[i].lifeCount = Math.max(previousLifeCount - 1, 0);
    }
  }
};
