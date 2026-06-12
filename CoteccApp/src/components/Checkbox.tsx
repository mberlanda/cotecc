import React from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {theme} from '../theme';

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
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
    <Text style={styles.text}>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  checkbox: {
    height: 22,
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    marginRight: theme.spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.white,
    fontWeight: '900',
  },
  text: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
});

export default Checkbox;
