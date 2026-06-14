import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {theme} from '../theme';
import {Player} from '../types';

const MEDALS = ['🥇', '🥈', '🥉'];

interface PodiumProps {
  standings: Player[];
  title: string;
  // Marker appended to the human's row (e.g. "(You)") and label for the
  // human's position line shown when they finish outside the top three.
  youLabel?: string;
  positionLabel?: string;
}

const Podium: React.FC<PodiumProps> = ({
  standings,
  title,
  youLabel,
  positionLabel,
}) => {
  const topThree = standings.slice(0, MEDALS.length);
  const humanIndex = standings.findIndex(p => p.isHuman);
  const humanOffPodium = humanIndex >= MEDALS.length;

  return (
    <View style={styles.container} testID="podium">
      <Text style={styles.title}>{title}</Text>
      {topThree.map((player, index) => (
        <Text
          key={player.ID}
          testID={`podium-row-${index}`}
          style={[styles.row, index === 0 && styles.winnerRow]}>
          {`${MEDALS[index]} ${player.name}`}
          {player.isHuman && youLabel ? ` ${youLabel}` : ''}
        </Text>
      ))}
      {humanOffPodium && positionLabel ? (
        <Text style={styles.position} testID="human-position">
          {`${positionLabel} ${humanIndex + 1}`}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  row: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  winnerRow: {
    fontSize: 26,
    fontWeight: '900',
  },
  position: {
    color: theme.colors.inkMuted,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});

export default Podium;
