import {isLocalSeat, Seat, seatForPlayer} from './seat';

const seats: Seat[] = [
  {
    seatId: 's1',
    playerId: 1,
    displayName: 'A',
    controller: 'local',
    connection: 'connected',
    isHostSeat: true,
  },
  {
    seatId: 's2',
    playerId: 2,
    displayName: 'B',
    controller: 'ai',
    connection: 'connected',
    isHostSeat: false,
  },
];

describe('seat model', () => {
  it('seatForPlayer finds the seat by engine playerId', () => {
    expect(seatForPlayer(seats, 2)?.seatId).toBe('s2');
    expect(seatForPlayer(seats, 99)).toBeUndefined();
  });
  it('isLocalSeat compares against localSeatId', () => {
    expect(isLocalSeat(seats[0], 's1')).toBe(true);
    expect(isLocalSeat(seats[1], 's1')).toBe(false);
  });
});
