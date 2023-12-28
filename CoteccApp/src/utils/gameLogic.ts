import {cardIsGreater, createDeck, dealCards, shuffleDeck} from './cardsLogic';
import {findPlayerById, nextPlayerID} from './playerLogic';
import {endTurn, newTurn, resetTurnState} from './turnLogic';
import {Card, GameState, Player, Round} from '../types';

const newRound = (ID: number, initialPlayerID: number): Round => {
  return {
    ID,
    initialPlayerID,
    currentTurn: newTurn(initialPlayerID),
    pastTurns: [],
    scoresMap: {},
  };
};

export const newGame = (
  players: Player[],
  initialPlayerID: number,
  maxLifeCount: number,
): GameState => {
  const shuffledDeck = shuffleDeck(createDeck());
  dealCards(shuffledDeck, players);
  return {
    players: players,
    deck: shuffledDeck,
    initialPlayerID: initialPlayerID,
    currentRound: newRound(1, initialPlayerID),
    pastRounds: [],
    maxLifeCount: maxLifeCount,
  };
};

export const playCard = (
  gameState: GameState,
  playerID: number,
  playedCard: Card,
): void => {
  try {
    const player = findPlayerById(gameState.players, playerID);
    validateCurrentPlayer(gameState, player);
    validateSuit(gameState, player, playedCard);
    processCardPlay(gameState, player, playedCard);
  } catch (err) {
    console.log(err);
    // TODO: return an exception visible in the UI
    return;
  }
};

export const validateCurrentPlayer = (
  gameState: GameState,
  player: Player,
): void => {
  if (gameState.currentRound.currentTurn.currentPlayerID !== player.ID) {
    throw Error(
      `Player ${player.ID} tried to play while it was player ${gameState.currentRound.currentTurn.currentPlayerID} move`,
    );
  }
};

export const validateSuit = (
  gameState: GameState,
  player: Player,
  playedCard: Card,
): void => {
  const currentSuit = gameState.currentRound.currentTurn.suit;
  if (!currentSuit || playedCard.suit === currentSuit) {
    return;
  }
  const hasSuit = player.hand.some(card => card.suit === currentSuit);
  if (hasSuit) {
    throw Error(
      `Illegal move. Player ${player.ID} should respect ${currentSuit}`,
    );
  }
};

export const processCardPlay = (
  gameState: GameState,
  player: Player,
  playedCard: Card,
): void => {
  // Ensure player holds the card selected.
  const cardIndex = player.hand.findIndex(c => c === playedCard);
  if (cardIndex === -1) {
    throw Error(
      `Player ${player.ID} does not own card: ${JSON.stringify(playedCard)}`,
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
    gameState.currentRound.currentTurn.winnerID = player.ID;
  }

  const removedCard = player.hand.splice(cardIndex, 1);
  gameState.currentRound.currentTurn.moves.push({
    playerID: player.ID,
    card: removedCard[0],
  });
  nextMove(gameState, player);
};

export const nextMove = (gameState: GameState, player: Player): void => {
  // When all players made their move, the round is over
  const playersCount = gameState.players.length;
  if (gameState.currentRound.currentTurn.moves.length === playersCount) {
    // All players have moved
    const winnerID = endTurn(gameState.currentRound);
    nextTurn(gameState, winnerID);
    return;
  }

  gameState.currentRound.currentTurn.currentPlayerID = nextPlayerID(
    gameState.players,
    player.ID,
  );
};

export const nextTurn = (gameState: GameState, playerID: number): void => {
  // When a player does not have card in their end, the round is over
  if (!gameState.players[0].hand.length) {
    endRound(gameState, playerID);
    return;
  }

  resetTurnState(gameState.currentRound, playerID);
};

export const endRound = (gameState: GameState, playerID: number): void => {
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
    let turnLosers: {[playerID: number]: boolean} = {};
    console.log(
      `round scores: ${JSON.stringify(gameState.currentRound.scoresMap)}`,
    );
    for (let plID in gameState.currentRound.scoresMap) {
      const score = gameState.currentRound.scoresMap[plID];
      if (score > maxScore) {
        console.log(
          `score: ${score} prevMaxScore: ${maxScore} playerID: ${plID}`,
        );
        maxScore = score;
        turnLosers = {};
      }
      if (score === maxScore) {
        turnLosers[plID] = true;
      }
    }
    console.log(`turnLosers: ${JSON.stringify(turnLosers)}`);
    gameState.players.forEach(player => {
      if (player.ID in turnLosers) {
        player.lifeCount -= 1;
      }
    });
  }

  // TODO: implement elimination logic
  checkForElimination(gameState.players);

  // TODO: this should take in account only players with >0 lifeCount
  const nextInitialPlayerID = nextPlayerID(
    gameState.players,
    gameState.initialPlayerID,
  );

  gameState.pastRounds.push({...gameState.currentRound});

  gameState.initialPlayerID = nextInitialPlayerID;
  gameState.deck = shuffleDeck(createDeck());
  gameState.currentRound.scoresMap = {};
  resetRoundState(gameState, nextInitialPlayerID);
};

export const resetRoundState = (
  gameState: GameState,
  playerID: number,
): void => {
  gameState.currentRound = newRound(gameState.currentRound.ID + 1, playerID);
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
