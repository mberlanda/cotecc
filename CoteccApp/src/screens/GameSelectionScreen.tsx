// GameSelectionScreen.tsx
import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, View} from 'react-native';

import {NavigationProp} from '@react-navigation/native';

import Checkbox from '../components/Checkbox';
import PickerModal from '../components/PickerModal';
import PrimaryButton from '../components/PrimaryButton';

const GameSelectionScreen = ({
  navigation,
}: {
  navigation: NavigationProp<any>;
}) => {
  const [gameSpeed, setGameSpeed] = useState(500);
  const [opponents, setOpponents] = useState(3);
  const [name, setName] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [maxLifeCount, setMaxLifeCount] = useState(4);

  const opponentsOptions: {[key: string]: string} = {
    1: '1',
    2: '2',
    3: '3',
    4: '4',
  };

  const gameSpeedOptions: {[key: number]: string} = {
    500: 'fast',
    1000: 'normal',
    1500: 'slow',
  };

  const maxLifeCountOptions: {[key: number]: string} = {
    2: '2',
    3: '3',
    4: '4',
    5: '5',
  };

  const startGame = () => {
    if (name.trim().length === 0) {
      Alert.alert('Invalid Input', 'Please enter your name.');
      return;
    }

    navigation.navigate('GameScreen', {
      gameSpeed,
      opponents,
      name,
      showDebug,
      maxLifeCount,
    });
  };

  return (
    <View style={styles.container}>
      <Text>Enter Your Name:</Text>
      <TextInput
        style={styles.input}
        onChangeText={setName}
        value={name}
        placeholder="Your Name"
      />
      <PickerModal
        id={'opponents'}
        options={opponentsOptions}
        selectedValue={String(opponents)}
        title="Number of Opponents"
        onValueChange={itemValue => setOpponents(+itemValue)}
      />

      <PickerModal
        id={'game-speed'}
        options={gameSpeedOptions}
        selectedValue={gameSpeed}
        title="Game speed"
        onValueChange={itemValue => setGameSpeed(+itemValue)}
      />

      <PickerModal
        id={'max-life-count'}
        options={maxLifeCountOptions}
        selectedValue={maxLifeCount}
        title="Max lives"
        onValueChange={itemValue => setMaxLifeCount(+itemValue)}
      />

      <Checkbox
        checked={showDebug}
        onPress={() => setShowDebug(!showDebug)}
        text={'Show Debug Information'}
      />

      <PrimaryButton title="Start Game" onPress={startGame} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    width: '100%',
    marginBottom: 20,
    padding: 10,
  },
  picker: {
    width: '100%',
    marginBottom: 20,
  },
});

export default GameSelectionScreen;
