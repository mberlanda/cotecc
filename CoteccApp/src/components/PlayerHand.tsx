import React from 'react';
import { Player } from '../types';
import CardComponent from './CardComponent';

const PlayerHand = ({ player }: { player: Player }) => (
  <div>
    {player.hand.map(card => <CardComponent key={card.rank + card.suit} card={card} />)}
  </div>
);

export default PlayerHand;
