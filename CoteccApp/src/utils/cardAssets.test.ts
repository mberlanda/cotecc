import {describe, expect, it} from '@jest/globals';

import cardImages from './cardAssets';
import {createDeck} from './cardsLogic';

describe('cardAssets', () => {
  it('maps every playable card to an image asset', () => {
    createDeck().forEach(card => {
      expect(cardImages[`${card.rank}_${card.suit}`]).toBeDefined();
    });
  });
});
