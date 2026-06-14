export enum Suit {
  Bastoni = 'bastoni',
  Spade = 'spade',
  Coppe = 'coppe',
  Ori = 'ori',
}

// How long the final trick of a round stays on screen before the deal view for
// the next round appears, giving the player time to see the last hand played.
export const ROUND_END_DELAY_MS = 1000;

// Brief "Game Over" pause shown to an eliminated human before the remaining
// game is fast-simulated and the final podium is revealed.
export const GAME_OVER_SIM_DELAY_MS = 800;
