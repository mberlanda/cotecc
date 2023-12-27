import {cardIsGreater, createDeck, dealCards, shuffleDeck} from './cardsLogic';
import {findPlayerById, nextPlayerID} from './playerLogic';
import {Card, GameState, Player, Turn} from '../types';

export const newRound = (
  players: Player[],
  initialPlayerID: number,
): GameState => {
  const shuffledDeck = shuffleDeck(createDeck());
  dealCards(shuffledDeck, players);
  return {
    players: players,
    deck: shuffledDeck,
    initialPlayerID: initialPlayerID,
    currentTurn: newTurn(initialPlayerID),
    pastTurns: [],
    scores: {},
  };
};

export const newTurn = (playerID: number): Turn => {
  return {
    currentPlayerID: playerID,
    highestCard: null,
    moves: [],
    suit: null,
    winnerID: null,
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
  if (gameState.currentTurn.currentPlayerID !== player.ID) {
    throw Error(
      `Player ${player.ID} tried to play while it was player ${gameState.currentTurn.currentPlayerID} move`,
    );
  }
};

export const validateSuit = (
  gameState: GameState,
  player: Player,
  playedCard: Card,
): void => {
  const currentSuit = gameState.currentTurn.suit;
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
  if (!gameState.currentTurn.suit) {
    gameState.currentTurn.suit = playedCard.suit;
  }

  // Update the highest card if applicable
  if (
    !gameState.currentTurn.highestCard ||
    (playedCard.suit === gameState.currentTurn.suit &&
      cardIsGreater(playedCard, gameState.currentTurn.highestCard))
  ) {
    gameState.currentTurn.highestCard = playedCard;
    gameState.currentTurn.winnerID = player.ID;
  }

  const removedCard = player.hand.splice(cardIndex, 1);
  gameState.currentTurn.moves.push({
    playerID: player.ID,
    card: removedCard[0],
  });
  nextMove(gameState, player);
};

export const nextMove = (gameState: GameState, player: Player): void => {
  // When all players made their move, the round is over
  const playersCount = gameState.players.length;
  if (gameState.currentTurn.moves.length === playersCount) {
    // All players have moved
    endTurn(gameState);
    return;
  }

  gameState.currentTurn.currentPlayerID = nextPlayerID(
    gameState.players,
    player.ID,
  );
};

export const endTurn = (gameState: GameState): void => {
  const score = gameState.currentTurn.moves.reduce(
    (s, m) => s + m.card.points,
    0,
  );
  const winnerID = gameState.currentTurn.winnerID!;
  gameState.pastTurns.push(gameState.currentTurn);
  gameState.scores[winnerID] ||= 0;
  gameState.scores[winnerID] += score;
  nextTurn(gameState, winnerID);
};

export const nextTurn = (gameState: GameState, playerID: number): void => {
  // When a player does not have card in their end, the round is over
  if (!gameState.players[0].hand.length) {
    endRound(gameState, playerID);
    return;
  }

  // resetTurnState
  resetTurnState(gameState, playerID);
};

export const endRound = (gameState: GameState, playerID: number): void => {
  // Handle end of a round, such as calculating scores, dealing new cards, etc.
  // Reset players' hands or game state as needed\
  // The last hand awards an additional 6 points.
  gameState.scores[playerID] += 6;

  // A player taking all cards does a "capòt", reducing their score by one,
  // while others increase by one
  const turnWinnersSet = new Set(gameState.pastTurns.map(t => t.winnerID));
  if (turnWinnersSet.size === 1) {
    console.log('capòt');
    const winnerID = turnWinnersSet.values().next().value;
    for (let i = 0; i < gameState.players.length; i++) {
      const previousLifeCount = gameState.players[i].lifeCount;
      if (gameState.players[i].ID === winnerID) {
        gameState.players[i].lifeCount = Math.max(previousLifeCount - 1, 0);
      } else {
        // TODO: retrieve max number of lifes from the gameState
        gameState.players[i].lifeCount += Math.min(previousLifeCount + 1, 4);
      }
    }
  }
  // Give a bola to the players with the highest score
  // This code can be made much more elegant
  else {
    let maxScore = -1;
    let turnLosers: {[playerID: number]: boolean} = {};
    console.log(`round scores: ${JSON.stringify(gameState.scores)}`);
    for (let plID in gameState.scores) {
      const score = gameState.scores[plID];
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
  gameState.initialPlayerID = nextInitialPlayerID;
  gameState.deck = shuffleDeck(createDeck());
  gameState.pastTurns = [];
  gameState.scores = {};
  resetTurnState(gameState, nextInitialPlayerID);
};

export const resetTurnState = (
  gameState: GameState,
  playerID: number,
): void => {
  gameState.currentTurn = newTurn(playerID);
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
