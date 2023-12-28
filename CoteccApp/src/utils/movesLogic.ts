import {Move} from '../types';

export const calculateScore = (moves: Move[]): number => {
  return moves.reduce((acc, m) => acc + m.card.points, 0);
};
