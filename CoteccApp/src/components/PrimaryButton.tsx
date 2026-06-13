import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';

import {theme} from '../theme';

const PrimaryButton = ({
  title,
  onPress,
  testID,
}: {
  title: string;
  onPress: () => void;
  testID?: string;
}) => {
  return (
    <TouchableOpacity
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={styles.button}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
});

export default PrimaryButton;
