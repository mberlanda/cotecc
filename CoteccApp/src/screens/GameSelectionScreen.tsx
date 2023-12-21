// GameSelectionScreen.tsx
import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, View} from 'react-native';

import {Picker} from '@react-native-picker/picker';
import {NavigationProp} from '@react-navigation/native';

import Checkbox from '../components/Checkbox';
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

  const gameSpeedMap: {[key: number]: string} = {
    500: 'fast',
    1000: 'normal',
    1500: 'slow',
  };

  const startGame = () => {
    if (name.trim().length === 0) {
      Alert.alert('Invalid Input', 'Please enter your name.');
      return;
    }

    navigation.navigate('GameScreen', {gameSpeed, opponents, name, showDebug});
  };

  return (
    <View style={styles.container}>
      <Text>Number of Opponents: {opponents}</Text>
      <Picker
        selectedValue={opponents}
        onValueChange={itemValue => setOpponents(itemValue)}
        style={styles.picker}>
        <Picker.Item label="1" value={1} />
        <Picker.Item label="2" value={2} />
        <Picker.Item label="3" value={3} />
        <Picker.Item label="4" value={4} />
      </Picker>

      <Text>Enter Your Name:</Text>
      <TextInput
        style={styles.input}
        onChangeText={setName}
        value={name}
        placeholder="Your Name"
      />

      <Checkbox
        checked={showDebug}
        onPress={() => setShowDebug(!showDebug)}
        text={'Show Debug Information'}
      />

      <Text>Game Speed: {gameSpeedMap[gameSpeed]}</Text>
      <Picker
        selectedValue={gameSpeed}
        onValueChange={itemValue => setGameSpeed(itemValue)}
        style={styles.picker}>
        {Object.keys(gameSpeedMap).map(val => (
          <Picker.Item label={gameSpeedMap[+val]} value={val} />
        ))}
      </Picker>

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
