import {createDeck, dealCards, shuffleDeck} from './cardsLogic';
import {Player, PlayerHand, PlayerID} from '../types';

export const newPlayersHand = (players: Player[]): PlayerHand[] => {
  const shuffledDeck = shuffleDeck(createDeck());
  const playerHands = players
    .filter(p => p.lifeCount > 0)
    .map(p => toPlayerHand(p));
  dealCards(shuffledDeck, playerHands);
  return playerHands;
};

export const toPlayerHand = (player: Player): PlayerHand => {
  return {
    isHuman: player.isHuman,
    playerID: player.ID,
    cards: [],
  };
};

export const nextHandPlayerID = (
  players: PlayerHand[],
  playerID: PlayerID,
): PlayerID => {
  const playersCount = players.length;
  const currentPlayerIndex = players.findIndex(h => h.playerID === playerID);
  return players[(currentPlayerIndex + 1) % playersCount].playerID;
};
