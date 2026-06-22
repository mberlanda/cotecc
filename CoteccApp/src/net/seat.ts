import {PlayerID} from '../types';

export type SeatId = string;
export type Controller = 'local' | 'remote' | 'ai';
export type SeatConnection = 'connected' | 'grace' | 'disconnected';

export interface Seat {
  seatId: SeatId; // stable for the match (not the engine PlayerID alias)
  playerId: PlayerID; // engine id
  displayName: string;
  controller: Controller; // who acts for this seat now
  connection: SeatConnection;
  isHostSeat: boolean;
}

export const seatForPlayer = (
  seats: Seat[],
  playerId: PlayerID,
): Seat | undefined => seats.find(s => s.playerId === playerId);

export const isLocalSeat = (seat: Seat, localSeatId: SeatId): boolean =>
  seat.seatId === localSeatId;
