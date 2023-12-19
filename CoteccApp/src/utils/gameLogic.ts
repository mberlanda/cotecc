import {
  cardIsGreater,
  createDeck,
  dealCards,
  getCardsWithSuit,
  shuffleDeck,
} from './cardsLogic';
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

export const playAICard = (gameState: GameState, player: Player): void => {
  // no smart logic, plays a random card after checking the suit.
  if (!player.hand.length) {
    throw Error(`AI player ${player.ID} does not own any card`);
  }

  const cardsWithSuit = getCardsWithSuit(
    gameState.currentTurn.suit,
    player.hand,
  );
  const playedCard =
    cardsWithSuit.length > 0
      ? cardsWithSuit[Math.floor(Math.random() * cardsWithSuit.length)]
      : player.hand[Math.floor(Math.random() * player.hand.length)];

  playCard(gameState, player.ID, playedCard);
  console.log(
    `AI player ${player.ID} selected card ${playedCard.rank} ${playedCard.suit}`,
  );
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
      if (gameState.players[i].ID === winnerID) {
        const previousBoleCount = gameState.players[i].boleCount;
        gameState.players[i].boleCount = Math.max(previousBoleCount - 1, 0);
      } else {
        gameState.players[i].boleCount += 1;
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
        player.boleCount += 1;
      }
    });
  }

  // TODO: implement elimination logic
  checkForElimination(gameState.players);

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
    if (player.boleCount >= 4) {
      // Eliminate player
      // Additional logic for re-entering the game with a higher score might be needed
      // TODO: implement some logic to mark the player as eliminated
    }
  });
};
