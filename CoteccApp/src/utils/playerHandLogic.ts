import {
  createDeck,
  dealCards,
  shuffleDeck,
  updateCardsBitMap,
} from './cardsLogic';
import {newSuitMap, Player, PlayerHand} from '../types';

export const newPlayerHands = (players: Player[]): PlayerHand[] => {
  const shuffledDeck = shuffleDeck(createDeck());
  const playerHands: PlayerHand[] = players
    .filter(p => p.lifeCount > 0)
    .map(p => toPlayerHand(p));
  dealCards(shuffledDeck, playerHands);
  playerHands.forEach(p =>
    p.cards.forEach(c => updateCardsBitMap(p.cardsBitMap, c)),
  );
  return playerHands;
};

const toPlayerHand = (player: Player): PlayerHand => {
  return {
    playerID: player.ID,
    isHuman: player.isHuman,
    cards: [],
    cardsBitMap: newSuitMap<number>(0b000000000000),
  };
};

export const nextPlayerID = (hands: PlayerHand[], playerID: number): number => {
  const playersCount = hands.length;
  const currentPlayerIndex = hands.findIndex(h => h.playerID === playerID);
  return hands[(currentPlayerIndex + 1) % playersCount].playerID;
};
