import React from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const Checkbox = ({
  checked,
  text,
  onPress,
}: {
  checked: boolean;
  text: string;
  onPress: (event: GestureResponderEvent) => void;
}) => (
  <TouchableOpacity style={styles.checkboxContainer} onPress={onPress}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]} />
    <Text>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
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

export default Checkbox;
