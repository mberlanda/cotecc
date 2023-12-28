import {Player, PlayerHand} from '../types';

export const toPlayerHand = (player: Player): PlayerHand => {
  return {
    isHuman: player.isHuman,
    playerID: player.ID,
    cards: [],
  };
};
