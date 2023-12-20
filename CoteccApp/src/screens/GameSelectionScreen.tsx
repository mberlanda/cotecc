// GameSelectionScreen.tsx
import React, {useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {Picker} from '@react-native-picker/picker';
import {NavigationProp} from '@react-navigation/native';

import PrimaryButton from '../components/PrimaryButton';

const GameSelectionScreen = ({
  navigation,
}: {
  navigation: NavigationProp<any>;
}) => {
  const [opponents, setOpponents] = useState(1);
  const [name, setName] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  const startGame = () => {
    if (name.trim().length === 0) {
      Alert.alert('Invalid Input', 'Please enter your name.');
      return;
    }

    navigation.navigate('GameScreen', {opponents, name, showDebug});
  };

  return (
    <View style={styles.container}>
      <Text>Select Number of Opponents:</Text>
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

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setShowDebug(!showDebug)}>
        <View style={[styles.checkbox, showDebug && styles.checkboxChecked]} />
        <Text>Show Debug Information</Text>
      </TouchableOpacity>

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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    height: 20,
    width: 20,
    backgroundColor: '#FFF',
    borderColor: '#000',
    borderWidth: 1,
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#000',
  },
});

export default GameSelectionScreen;
