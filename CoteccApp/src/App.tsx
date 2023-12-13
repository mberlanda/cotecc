import React, {useState} from 'react';
import {SafeAreaView, StatusBar, useColorScheme} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import GameScreen from './screens/GameScreen';
import {GameState, Player} from './types';
import {newRound} from './utils/gameLogic';

const initialPlayers: Player[] = [
  // Initialize players with empty hands and scores
  {ID: 0, name: 'foo', hand: [], boleCount: 0, isHuman: true},
  {ID: 1, name: 'bar', hand: [], boleCount: 0, isHuman: false},
  {ID: 2, name: 'baz', hand: [], boleCount: 0, isHuman: false},
  // ... for all five players
  // test
];

const App = () => {
  const [gameState, _setGameState] = useState<GameState>({
    ...newRound(initialPlayers, initialPlayers[0].ID),
  });

  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <GameScreen gameState={gameState} />
    </SafeAreaView>
  );
};

export default App;
