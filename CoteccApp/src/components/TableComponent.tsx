import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Move} from '../types';
import CardComponent from './CardComponent';

const TableComponent = ({moves}: {moves: Move[]}) => {
  const onCardSelect = (_m: Move): void => {
    /*TODO: implement*/
  };

  return (
    <View style={styles.container}>
      <Text>Table</Text>
      <FlatList
        data={moves}
        renderItem={({item}) => (
          <CardComponent
            card={item.card}
            playerID={item.playerID}
            onCardSelect={onCardSelect}
          />
        )}
        keyExtractor={(item, index) => index.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 100,
  },
  card: {
    width: 60, // Adjust width and height as needed
    height: 90,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderWidth: 1,
    borderColor: 'black',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
});

export default TableComponent;
