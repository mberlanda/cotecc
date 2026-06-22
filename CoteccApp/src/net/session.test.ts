import {Seat} from './seat';
import {GameSession} from './session';
import {Player} from '../types';
import {newGame} from '../utils/gameLogic';

const players: Player[] = [
  {ID: 1, name: 'A', isHuman: true, lifeCount: 3},
  {ID: 2, name: 'B', isHuman: false, lifeCount: 3},
];
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
    controller: 'remote',
    connection: 'connected',
    isHostSeat: false,
  },
];

describe('GameSession host authority', () => {
  it('applies a legal move from the seat whose turn it is and bumps serverSeq', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const before = session.viewFor('s1');
    const card = before.localHand[0];
    const res = session.submitMove('s1', {
      cardRef: {suit: card.suit, rank: card.rank},
      clientSeq: 1,
    });
    expect(res.ok).toBe(true);
    expect(session.viewFor('s1').serverSeq).toBeGreaterThan(before.serverSeq);
  });

  it('rejects a duplicate clientSeq as idempotent (no re-apply)', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const card = session.viewFor('s1').localHand[0];
    session.submitMove('s1', {
      cardRef: {suit: card.suit, rank: card.rank},
      clientSeq: 1,
    });
    const handLen = session.viewFor('s1').localHand.length;
    const s2LenBefore = session.viewFor('s2').localHand.length;
    const dup = session.submitMove('s1', {
      cardRef: {suit: card.suit, rank: card.rank},
      clientSeq: 1,
    });
    expect(dup.ok).toBe(true); // idempotent re-ack
    expect(session.viewFor('s1').localHand.length).toBe(handLen); // not re-applied
    expect(session.viewFor('s2').localHand.length).toBe(s2LenBefore); // and not mis-applied to another seat
  });

  it('rejects a clientSeq gap with STALE_STATE', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const card = session.viewFor('s1').localHand[0];
    const res = session.submitMove('s1', {
      cardRef: {suit: card.suit, rank: card.rank},
      clientSeq: 5,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('STALE_STATE');
  });
});
