import React from 'react';
import {View, StyleSheet, Image, ScrollView} from 'react-native';

const StickyHeader = () => {
  const headerSource = require('../assets/placeholder-header.png');

  return (
    <ScrollView stickyHeaderIndices={[0]}>
      <View style={styles.header}>
        <Image source={headerSource} resizeMode="cover" style={styles.image} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 100, // Set your desired header height
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default StickyHeader;
