import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

import CardComponent from './CardComponent';
import {theme} from '../theme';
import {Move, Player, PlayerHand, PlayerID} from '../types';

type SeatPosition = {
  top?: `${number}%`;
  bottom?: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
  centered?: boolean;
};

const seatLayouts: Record<number, SeatPosition[]> = {
  2: [
    {bottom: '4%', left: '50%', centered: true},
    {top: '4%', left: '50%', centered: true},
  ],
  3: [
    {bottom: '4%', left: '50%', centered: true},
    {top: '12%', left: '13%'},
    {top: '12%', right: '13%'},
  ],
  4: [
    {bottom: '4%', left: '50%', centered: true},
    {top: '43%', left: '4%'},
    {top: '4%', left: '50%', centered: true},
    {top: '43%', right: '4%'},
  ],
  5: [
    {bottom: '4%', left: '50%', centered: true},
    {bottom: '20%', left: '4%'},
    {top: '8%', left: '18%'},
    {top: '8%', right: '18%'},
    {bottom: '20%', right: '4%'},
  ],
  6: [
    {bottom: '4%', left: '50%', centered: true},
    {bottom: '17%', left: '4%'},
    {top: '22%', left: '5%'},
    {top: '4%', left: '50%', centered: true},
    {top: '22%', right: '5%'},
    {bottom: '17%', right: '4%'},
  ],
};

const TableComponent = ({
  players,
  hands,
  moves,
  currentPlayerID,
  scoresMap,
  labels,
}: {
  players: Player[];
  hands: PlayerHand[];
  moves: Move[];
  currentPlayerID: PlayerID;
  scoresMap: {[playerID: PlayerID]: number};
  labels: {
    cards: string;
    currentTrick: string;
    waitingForLead: string;
  };
}) => {
  const {width} = useWindowDimensions();
  const compact = width < 560;
  const seatWidth = compact ? 96 : 124;
  const layout = seatLayouts[players.length] || seatLayouts[6];
  const onCardSelect = (_m: Move): void => {
    /*TODO: implement*/
  };

  return (
    <View style={[styles.container, compact ? styles.containerCompact : null]}>
      <View style={styles.tableSurface}>
        <View style={styles.feltRing}>
          <Text style={styles.tableTitle}>{labels.currentTrick}</Text>
          <View style={styles.movesRow}>
            {moves.length ? (
              moves.map((item, index) => (
                <CardComponent
                  key={`${item.playerID}-${index}`}
                  card={item.card}
                  playerID={item.playerID}
                  onCardSelect={onCardSelect}
                  cardStyles={
                    compact ? styles.tableCardCompact : styles.tableCard
                  }
                />
              ))
            ) : (
              <Text style={styles.emptyTable}>{labels.waitingForLead}</Text>
            )}
          </View>
        </View>
      </View>
      {players.map((player, index) => {
        const hand = hands.find(item => item.playerID === player.ID);
        const seatStyle = getSeatStyle(layout[index], seatWidth);
        return (
          <View
            key={player.ID}
            style={[
              styles.seat,
              compact ? styles.seatCompact : null,
              seatStyle,
              player.ID === currentPlayerID ? styles.activeSeat : null,
              player.lifeCount === 0 ? styles.eliminatedSeat : null,
            ]}>
            <View style={styles.seatHeader}>
              <Text style={styles.seatIcon}>
                {player.isHuman ? '♠' : index % 2 === 0 ? '♦' : '♣'}
              </Text>
              <Text numberOfLines={1} style={styles.playerName}>
                {player.name}
              </Text>
            </View>
            <View style={styles.seatStats}>
              <Text style={styles.statText}>♥ {player.lifeCount}</Text>
              <Text style={styles.statText}>● {scoresMap[player.ID] || 0}</Text>
              <Text style={styles.statText}>
                {hand?.cards.length || 0} {labels.cards}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const getSeatStyle = (
  position: SeatPosition,
  width: number,
): StyleProp<ViewStyle> => [
  {
    width,
    top: position.top,
    bottom: position.bottom,
    left: position.left,
    right: position.right,
    marginLeft: position.centered ? -width / 2 : undefined,
  },
];

const styles = StyleSheet.create({
  container: {
    minHeight: 500,
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  containerCompact: {
    minHeight: 430,
    paddingHorizontal: theme.spacing.sm,
  },
  tableSurface: {
    height: '58%',
    minHeight: 230,
    width: '68%',
    minWidth: 240,
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: 240,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.tableDark,
    borderWidth: 5,
    borderColor: theme.colors.gold,
    ...theme.shadow,
  },
  feltRing: {
    flex: 1,
    borderRadius: 220,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: theme.colors.table,
    padding: theme.spacing.md,
  },
  tableTitle: {
    color: theme.colors.surface,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  movesRow: {
    minHeight: 92,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  emptyTable: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.85,
    textAlign: 'center',
  },
  tableCard: {
    width: 45,
    height: 84,
    margin: 2,
  },
  tableCardCompact: {
    width: 34,
    height: 63,
    margin: 1,
  },
  seat: {
    position: 'absolute',
    minHeight: 82,
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  seatCompact: {
    minHeight: 74,
    padding: theme.spacing.xs,
  },
  activeSeat: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
  },
  eliminatedSeat: {
    opacity: 0.46,
  },
  seatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  seatIcon: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  playerName: {
    flex: 1,
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  seatStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  statText: {
    color: theme.colors.inkMuted,
    fontSize: 11,
    fontWeight: '800',
  },
});

export default TableComponent;
