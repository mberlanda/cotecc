import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {useLocalSearchParams} from 'expo-router';

import DealCardsButton from '../components/DealCardsButton';
import PastTurn from '../components/PastTurn';
import PlayerHandComponent from '../components/PlayerHandComponent';
import Podium from '../components/Podium';
import {StateDebugComponent} from '../components/StateDebug';
import StickyHeader from '../components/StickyHeader';
import TableComponent from '../components/TableComponent';
import {Language, translate} from '../i18n';
import {theme} from '../theme';
// eslint-disable-next-line no-restricted-imports -- TODO(phase0-seatview): GameScreen still runs the engine in-UI; refactor to consume a SeatView/session (Foundations §2.2, RC2-ARCH-001)
import {GameState, Move} from '../types';
import {aiMoveToPlay} from '../utils/aiPlayerLogic';
import {GAME_OVER_SIM_DELAY_MS, ROUND_END_DELAY_MS} from '../utils/constants';
// eslint-disable-next-line no-restricted-imports -- TODO(phase0-seatview): GameScreen still runs the engine in-UI; refactor to consume a SeatView/session (Foundations §2.2, RC2-ARCH-001)
import {
  getFinalStandings,
  isGameOver,
  isHumanEliminated,
  newGame,
  playCard,
  simulateGameToEnd,
} from '../utils/gameLogic';
import {generatePlayers} from '../utils/playerLogic';
// eslint-disable-next-line no-restricted-imports -- TODO(phase0-seatview): GameScreen still runs the engine in-UI; refactor to consume a SeatView/session (Foundations §2.2, RC2-ARCH-001)
import {nextRound} from '../utils/roundLogic';
import {boolParam, firstParam, numberParam} from '../utils/searchParams';

const GameScreen: React.FC = () => {
  const params = useLocalSearchParams();
  // Public URL: params may be missing (direct deep link / refresh) — default safely.
  const gameSpeed = numberParam(params.gameSpeed, 500);
  const playerCount = numberParam(params.playerCount, 4);
  const name = firstParam(params.name, 'Player');
  const showDebug = boolParam(params.showDebug);
  const maxLifeCount = numberParam(params.maxLifeCount, 4);
  const language = firstParam(params.language, 'en') as Language;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const initialPlayers = useMemo(
    () => generatePlayers(name, playerCount, maxLifeCount),
    [name, playerCount, maxLifeCount],
  );
  const [localGameState, setLocalGameState] = useState<GameState>(() => {
    return newGame(initialPlayers, initialPlayers[0].ID, maxLifeCount);
  });
  // When a round ends we keep the final trick on screen for a moment before
  // revealing the deal view for the next round (see ROUND_END_DELAY_MS). We
  // track the round whose delay has elapsed rather than a bare boolean, so the
  // deal view resets automatically once the next round is dealt.
  const [dealReadyRoundId, setDealReadyRoundId] = useState<number | null>(null);

  const handleCardSelect = (move: Move) => {
    if (
      move.playerID !== localGameState.currentRound.currentTurn.currentPlayerID
    ) {
      // TODO: display an error message in the UI
      console.log(
        `Player ${move.playerID} tried to play while it was player ${localGameState.currentRound.currentTurn.currentPlayerID} move`,
      );
      return;
    }
    playCard(localGameState, move.playerID, move.card);

    setLocalGameState({...localGameState});
  };

  useEffect(() => {
    const currentPlayerHand = localGameState.currentRound.players.find(
      p =>
        p.playerID === localGameState.currentRound.currentTurn.currentPlayerID,
    );
    // `currentPlayer.hand.length` is needed when the current turn is over
    // and the user has to tap DealCardsButton to start a new turn
    if (
      currentPlayerHand &&
      !currentPlayerHand.isHuman &&
      currentPlayerHand.cards.length
    ) {
      setTimeout(() => {
        const aiMove = aiMoveToPlay(
          currentPlayerHand,
          localGameState.currentRound.currentTurn,
          localGameState.currentRound.pastTurns,
          localGameState.currentRound.players.length,
        );
        console.log(aiMove);
        playCard(localGameState, aiMove.playerID, aiMove.card);

        setLocalGameState({...localGameState});
      }, gameSpeed);
    }
  });

  const humanEliminated = isHumanEliminated(localGameState.players);
  const gameOver = isGameOver(localGameState.players) || humanEliminated;
  // The human is out but AI players are still in: fast-forward to the finish so
  // we can show the final podium instead of leaving the player watching.
  const simulationPending =
    humanEliminated && !isGameOver(localGameState.players);
  const simulatedRef = useRef(false);

  useEffect(() => {
    if (!simulationPending || simulatedRef.current) {
      return;
    }
    simulatedRef.current = true;
    const timer = setTimeout(() => {
      simulateGameToEnd(localGameState);
      setLocalGameState({...localGameState});
    }, GAME_OVER_SIM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [simulationPending, localGameState]);

  const currentPlayer = localGameState.players.find(
    player =>
      player.ID === localGameState.currentRound.currentTurn.currentPlayerID,
  );
  const roundReadyForDeal = localGameState.currentRound.players.every(
    player => player.cards.length === 0,
  );
  const humanHand = localGameState.currentRound.players.find(
    player => player.isHuman,
  );

  const roundId = localGameState.currentRound.ID;

  // Delay the deal view after a round ends so the last trick stays visible.
  useEffect(() => {
    if (!roundReadyForDeal || gameOver) {
      return;
    }
    const timer = setTimeout(
      () => setDealReadyRoundId(roundId),
      ROUND_END_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [roundReadyForDeal, gameOver, roundId]);

  const dealViewReady =
    roundReadyForDeal && !gameOver && dealReadyRoundId === roundId;

  const doDealCards = () => {
    nextRound(localGameState);
    setLocalGameState({...localGameState});
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <StickyHeader />
      <View style={styles.roundBar}>
        <View>
          <Text style={styles.roundLabel}>
            {t('round')} {localGameState.currentRound.ID}
          </Text>
          <Text style={styles.roundTitle}>
            {currentPlayer
              ? `${currentPlayer.name}${t('turnSuffix')}`
              : t('table')}
          </Text>
        </View>
        <Text style={styles.playerCount}>
          {localGameState.players.length} {t('players').toLowerCase()}
        </Text>
      </View>
      {gameOver ? (
        simulationPending ? (
          <View style={styles.gameSummaryContainer}>
            <Text style={styles.gameOverText}>{t('gameOver')}</Text>
          </View>
        ) : (
          <Podium
            standings={getFinalStandings(localGameState)}
            title={t('gameOver')}
            youLabel={t('you')}
            positionLabel={t('yourPosition')}
          />
        )
      ) : roundReadyForDeal && dealViewReady ? (
        <View style={styles.gameSummaryContainer}>
          <Text style={styles.roundTitle}>{t('roundComplete')}</Text>
          <DealCardsButton doDealCards={doDealCards} title={t('dealCards')} />
        </View>
      ) : (
        <TableComponent
          players={localGameState.players}
          hands={localGameState.currentRound.players}
          moves={localGameState.currentRound.currentTurn.moves}
          currentPlayerID={
            localGameState.currentRound.currentTurn.currentPlayerID
          }
          scoresMap={localGameState.currentRound.scoresMap}
          labels={{
            cards: t('cards'),
            currentTrick: t('currentTrick'),
            waitingForLead: t('waitingForLead'),
          }}
        />
      )}
      {humanHand && !gameOver && humanHand.cards.length > 0 && (
        <View style={styles.handPanel}>
          <PlayerHandComponent
            hand={humanHand}
            onCardSelect={handleCardSelect}
            title={t('yourHand')}
            cardStyles={styles.handCard}
          />
        </View>
      )}
      <View style={styles.tricksPanel} testID="taken-tricks-panel">
        <Text style={styles.sectionTitle}>{t('takenTricks')}</Text>
        {localGameState.players.map(player => (
          <View
            key={player.ID}
            testID={`trick-row-${player.ID}`}
            style={[
              styles.trickRow,
              player.lifeCount === 0 ? styles.eliminatedPlayer : null,
            ]}>
            <Text style={styles.trickName}>
              {player.name} —{' '}
              {localGameState.currentRound.scoresMap[player.ID] || 0} pts ·{' '}
              {player.lifeCount}{' '}
              {(player.lifeCount === 1
                ? t('life')
                : t('lives')
              ).toLowerCase()}
            </Text>
            <PastTurn
              turns={localGameState.currentRound.pastTurns.filter(
                turn => turn.winnerID === player.ID,
              )}
            />
          </View>
        ))}
      </View>
      {showDebug && <StateDebugComponent state={localGameState} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  eliminatedPlayer: {
    opacity: 0.4,
  },
  roundBar: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  roundLabel: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  roundTitle: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  playerCount: {
    color: theme.colors.inkMuted,
    fontWeight: '800',
  },
  gameSummaryContainer: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  gameOverText: {
    color: theme.colors.ink,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    padding: theme.spacing.xl,
  },
  handPanel: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  handCard: {
    width: 54,
    height: 101,
  },
  tricksPanel: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  trickRow: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  trickName: {
    color: theme.colors.ink,
    fontWeight: '900',
    marginBottom: theme.spacing.sm,
  },
});

export default GameScreen;
