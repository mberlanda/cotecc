import React from 'react';
import {Text, View} from 'react-native';

import {GameState} from '../types';

export const StateDebugComponent = ({state}: {state: GameState}) => {
  return (
    <View>
      <Text>State Debug</Text>
      <Text>
        Current Player ID: {state.currentRound.currentTurn.currentPlayerID}
      </Text>
      <Text>
        Current Suit: {state.currentRound.currentTurn.suit || 'not set'}
      </Text>
      <Text>
        Current Highest Move:{' '}
        {JSON.stringify(state.currentRound.currentTurn.highestCard)}
      </Text>
      <Text>
        Current Moves: {JSON.stringify(state.currentRound.currentTurn.moves)}
      </Text>
      <Text>Past Turns:</Text>
      {state.currentRound.pastTurns.map((turn, index) => (
        <Text key={index}>
          {' '}
          Turn {index}: {JSON.stringify(turn)}
        </Text>
      ))}
    </View>
  );
};
