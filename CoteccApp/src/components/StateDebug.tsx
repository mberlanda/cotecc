import React from 'react';
import {Text, View} from 'react-native';

import {Round} from '../types';

export const StateDebugComponent = ({round}: {round: Round}) => {
  return (
    <View>
      <Text>State Debug</Text>
      <Text>Current Player ID: {round.currentTurn.currentPlayerID}</Text>
      <Text>Current Suit: {round.currentTurn.suit || 'not set'}</Text>
      <Text>
        Current Highest Move: {JSON.stringify(round.currentTurn.highestCard)}
      </Text>
      <Text>Current Moves: {JSON.stringify(round.currentTurn.moves)}</Text>
      <Text>Past Turns:</Text>
      {round.pastTurns.map((turn, index) => (
        <Text key={index}>
          {' '}
          Turn {index}: {JSON.stringify(turn)}
        </Text>
      ))}
    </View>
  );
};
