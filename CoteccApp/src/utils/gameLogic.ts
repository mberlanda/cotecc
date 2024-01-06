import {cardIsGreater} from './cardsLogic';
import {validateMove} from './movesLogic';
import {nextHandPlayerID} from './playerHandLogic';
import {newRound} from './roundLogic';
import {endTurn, resetTurnState} from './turnLogic';
import {Card, GameState, Player, PlayerHand, PlayerID} from '../types';

export const newGame = (
  players: Player[],
  initialPlayerID: PlayerID,
  maxLifeCount: number,
): GameState => {
  return {
    players: players,
    initialPlayerID: initialPlayerID,
    currentRound: newRound(1, initialPlayerID, players),
    pastRounds: [],
    maxLifeCount: maxLifeCount,
  };
};

export const playCard = (
  gameState: GameState,
  playerID: PlayerID,
  playedCard: Card,
): void => {
  try {
    const hand = gameState.currentRound.players.find(
      p => p.playerID === playerID,
    )!;
    validateMove(gameState.currentRound.currentTurn, hand, playedCard);
    processCardPlay(gameState, hand, playedCard);
  } catch (err) {
    console.log(err);
    // TODO: return an exception visible in the UI
    return;
  }
};

export const processCardPlay = (
  gameState: GameState,
  hand: PlayerHand,
  playedCard: Card,
): void => {
  // Ensure player holds the card selected.
  const cardIndex = hand.cards.findIndex(c => c === playedCard);
  if (cardIndex === -1) {
    throw Error(
      `Player ${hand.playerID} does not own card: ${JSON.stringify(
        playedCard,
      )}`,
    );
  }
  // Update the current suit if this is the first card of the round
  if (!gameState.currentRound.currentTurn.suit) {
    gameState.currentRound.currentTurn.suit = playedCard.suit;
  }

  // Update the highest card if applicable
  if (
    !gameState.currentRound.currentTurn.highestCard ||
    (playedCard.suit === gameState.currentRound.currentTurn.suit &&
      cardIsGreater(playedCard, gameState.currentRound.currentTurn.highestCard))
  ) {
    gameState.currentRound.currentTurn.highestCard = playedCard;
    gameState.currentRound.currentTurn.winnerID = hand.playerID;
  }

  const removedCard = hand.cards.splice(cardIndex, 1);
  gameState.currentRound.currentTurn.moves.push({
    playerID: hand.playerID,
    card: removedCard[0],
  });
  nextMove(gameState, hand);
};

export const nextMove = (gameState: GameState, hand: PlayerHand): void => {
  // When all players made their move, the round is over
  const playersCount = gameState.currentRound.players.length;
  if (gameState.currentRound.currentTurn.moves.length === playersCount) {
    // All players have moved
    const winnerID = endTurn(gameState.currentRound);
    if (roundIsOver(gameState)) {
      endRound(gameState, winnerID);
    } else {
      resetTurnState(gameState.currentRound, winnerID);
    }
    return;
  }

  gameState.currentRound.currentTurn.currentPlayerID = nextHandPlayerID(
    gameState.currentRound.players,
    hand.playerID,
  );
};

// TODO: remove this method after moving player hand into Round
const roundIsOver = (gameState: GameState): boolean => {
  return gameState.currentRound.players.reduce(
    (acc, p) => acc && p.cards.length === 0,
    true,
  );
};

export const endRound = (gameState: GameState, playerID: PlayerID): void => {
  // Handle end of a round, such as calculating scores, dealing new cards, etc.
  // Reset players' hands or game state as needed\
  // The last hand awards an additional 6 points.
  gameState.currentRound.scoresMap[playerID] += 6;

  // A player taking all cards does a "capòt", reducing their score by one,
  // while others increase by one
  const turnWinnersSet = new Set(
    gameState.currentRound.pastTurns.map(t => t.winnerID),
  );
  if (turnWinnersSet.size === 1) {
    // TODO: return some messages about the round outcome with a categorization
    // between capot and max score so that it can be displayed in a message.
    const winnerID = turnWinnersSet.values().next().value;
    for (let i = 0; i < gameState.players.length; i++) {
      const previousLifeCount = gameState.players[i].lifeCount;
      if (gameState.players[i].ID === winnerID) {
        gameState.players[i].lifeCount = Math.min(
          previousLifeCount + 1,
          gameState.maxLifeCount,
        );
      } else {
        gameState.players[i].lifeCount = Math.max(previousLifeCount - 1, 0);
      }
    }
  }
  // Give a bola to the players with the highest score
  // This code can be made much more elegant
  else {
    let maxScore = -1;
    let turnLosers: {[playerID: PlayerID]: boolean} = {};
    for (let plID in gameState.currentRound.scoresMap) {
      const score = gameState.currentRound.scoresMap[plID];
      if (score > maxScore) {
        maxScore = score;
        turnLosers = {};
      }
      if (score === maxScore) {
        turnLosers[plID] = true;
      }
    }
    gameState.players.forEach(player => {
      if (player.ID in turnLosers) {
        player.lifeCount -= 1;
      }
    });
  }

  // TODO: implement elimination logic
  checkForElimination(gameState.players);
  gameState.pastRounds.push({...gameState.currentRound});
};

export const checkForElimination = (players: Player[]): void => {
  // Implement elimination check logic
  players.forEach(player => {
    if (player.lifeCount === 0) {
      // TODO: Eliminate player by creating rounds in a game and fitering out players with 0 lives
      // TODO: Additional logic for re-entering the game with a higher score might be needed
      // e.g. if after elimination the second last player has more than one life, the eliminated
      // one can be re-admitted with minLifes -1.
    }
  });
};
