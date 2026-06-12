import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {RouteProp} from '@react-navigation/native';

import DealCardsButton from '../components/DealCardsButton';
import PastTurn from '../components/PastTurn';
import PlayerHandComponent from '../components/PlayerHandComponent';
import {StateDebugComponent} from '../components/StateDebug';
import StickyHeader from '../components/StickyHeader';
import TableComponent from '../components/TableComponent';
import {translate} from '../i18n';
import {GameScreenRouteParams, RootStackParamList} from '../routes';
import {theme} from '../theme';
import {GameState, Move} from '../types';
import {aiMoveToPlay} from '../utils/aiPlayerLogic';
import {getGameWinner, isGameOver, newGame, playCard} from '../utils/gameLogic';
import {generatePlayers} from '../utils/playerLogic';
import {nextRound} from '../utils/roundLogic';

// Define an interface for the props
interface GameScreenProps {
  route: RouteProp<RootStackParamList, 'GameScreen'>;
}

const GameScreen: React.FC<GameScreenProps> = ({route}) => {
  const {
    gameSpeed,
    playerCount,
    name,
    showDebug,
    maxLifeCount,
    language,
  }: GameScreenRouteParams = route.params;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const initialPlayers = useMemo(
    () => generatePlayers(name, playerCount, maxLifeCount),
    [name, playerCount, maxLifeCount],
  );
  const [localGameState, setLocalGameState] = useState<GameState>(() => {
    return newGame(initialPlayers, initialPlayers[0].ID, maxLifeCount);
  });

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

  const gameOver = isGameOver(localGameState.players);
  const winner = gameOver ? getGameWinner(localGameState.players) : undefined;
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
        <View style={styles.gameSummaryContainer}>
          <Text style={styles.gameOverText}>
            {winner ? `${winner.name} ${t('winsGame')}` : t('noWinner')}
          </Text>
        </View>
      ) : roundReadyForDeal ? (
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
      <View style={styles.tricksPanel}>
        <Text style={styles.sectionTitle}>{t('takenTricks')}</Text>
        {localGameState.players.map(player => (
          <View
            key={player.ID}
            style={[
              styles.trickRow,
              player.lifeCount === 0 ? styles.eliminatedPlayer : null,
            ]}>
            <Text style={styles.trickName}>
              {player.name} -{' '}
              {localGameState.currentRound.scoresMap[player.ID] || 0} pts
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
