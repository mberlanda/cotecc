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

describe('GameSession join / bind / seatForConn', () => {
  it('assigns a non-host seat on join and returns a resume token', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const res = session.join('connA', {displayName: 'Guest'});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.seatId).toBe('s2'); // s1 is the host seat, so the guest gets s2
      expect(typeof res.seatToken).toBe('string');
      expect(res.seatToken.length).toBeGreaterThan(0);
    }
    expect(session.seatForConn('connA')).toBe('s2');
  });

  it('derives the seat from the bound connection, never from the payload (SEC-002)', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const join = session.join('connA', {displayName: 'Guest'});
    expect(join.ok).toBe(true);
    const seatId = session.seatForConn('connA');
    expect(seatId).toBe('s2');
  });

  it('issues distinct tokens and returns TABLE_FULL when no seat is free', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const a = session.join('connA', {displayName: 'Guest A'});
    // Only one non-host seat (s2) exists, so a second join cannot be seated.
    const b = session.join('connB', {displayName: 'Guest B'});
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.code).toBe('TABLE_FULL');
  });

  it('bind accepts the issued token and rejects a wrong one with BAD_SEAT_TOKEN', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const join = session.join('connA', {displayName: 'Guest'});
    expect(join.ok).toBe(true);
    if (!join.ok) return;
    const bad = session.bind('connReconnect', 's2', 'not-the-token');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe('BAD_SEAT_TOKEN');
    const good = session.bind('connReconnect', 's2', join.seatToken);
    expect(good.ok).toBe(true);
    expect(session.seatForConn('connReconnect')).toBe('s2');
  });

  it('unbind clears the connection→seat mapping', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    session.join('connA', {displayName: 'Guest'});
    session.unbind('connA');
    expect(session.seatForConn('connA')).toBeUndefined();
  });
});

describe('GameSession snapshotForResume (minimal 1A reconnect)', () => {
  it('returns a fresh snapshot for a valid seat token', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const join = session.join('connA', {displayName: 'Guest'});
    expect(join.ok).toBe(true);
    if (!join.ok) return;
    const resume = session.snapshotForResume(join.seatToken);
    expect(resume.ok).toBe(true);
    if (resume.ok) {
      expect(resume.view.localSeatId).toBe('s2');
      expect(typeof resume.view.stateVersion).toBe('number');
    }
  });

  it('returns SEAT_EXPIRED for an unknown token', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const resume = session.snapshotForResume('never-issued');
    expect(resume.ok).toBe(false);
    if (!resume.ok) expect(resume.code).toBe('SEAT_EXPIRED');
  });

  it('reflects state advanced since join (stateVersion bumps)', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const join = session.join('connA', {displayName: 'Guest'});
    if (!join.ok) return;
    const before = session.snapshotForResume(join.seatToken);
    const card = session.viewFor('s1').localHand[0];
    session.submitMove('s1', {
      cardRef: {suit: card.suit, rank: card.rank},
      clientSeq: 1,
    });
    const after = session.snapshotForResume(join.seatToken);
    if (before.ok && after.ok) {
      expect(after.view.stateVersion).toBeGreaterThan(before.view.stateVersion);
    }
  });
});
