import { createAuthContext } from "../contexts/authContext";
import { getSocketInstance, emit, on } from "../services/socketService";
import { createPongGame } from "../components/PongGame";
import { createChat } from "../components/Chat";

export default function Game(): HTMLElement {
  const authContext = createAuthContext();
  const user = authContext.getUser();

  let gameId: string | null = null;
  let gameState: any = null;
  let gameComponent: HTMLElement | null = null;
  let chatComponent: HTMLElement | null = null;

  const container = document.createElement("div");
  container.className = "container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8";

  const gameSection = document.createElement("div");
  gameSection.className = "w-full lg:w-3/4";

  const gameHeader = document.createElement("div");
  gameHeader.className = "flex justify-between items-center mb-6";

  const gameTitle = document.createElement("h1");
  gameTitle.className = "text-2xl font-bold";
  gameTitle.textContent = "Loading game...";

  const gameStatus = document.createElement("div");
  gameStatus.className = "px-3 py-1 rounded-full text-sm bg-yellow-600";
  gameStatus.textContent = "Connecting...";

  gameHeader.appendChild(gameTitle);
  gameHeader.appendChild(gameStatus);

  const gameContainer = document.createElement("div");
  gameContainer.className = "bg-background-dark rounded-lg overflow-hidden mb-6 flex items-center justify-center";
  gameContainer.style.minHeight = "600px";

  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "text-center py-12";
  loadingIndicator.innerHTML =
    '<div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div><p class="mt-4">Loading game...</p>';

  gameContainer.appendChild(loadingIndicator);

  const gameControls = document.createElement("div");
  gameControls.className = "bg-background-light rounded-lg p-6 mb-6";

  const controlsTitle = document.createElement("h2");
  controlsTitle.className = "text-xl font-bold mb-4";
  controlsTitle.textContent = "Game Controls";

  const controlsList = document.createElement("div");
  controlsList.className = "grid grid-cols-1 md:grid-cols-2 gap-4";
  controlsList.innerHTML = `
    <div>
      <h3 class="font-bold mb-2">Player 1:</h3>
      <p><span class="inline-block bg-gray-700 px-2 py-1 rounded mr-2">W</span> Move Up</p>
      <p><span class="inline-block bg-gray-700 px-2 py-1 rounded mr-2">S</span> Move Down</p>
    </div>
    <div>
      <h3 class="font-bold mb-2">Player 2:</h3>
      <p><span class="inline-block bg-gray-700 px-2 py-1 rounded mr-2">I</span> Move Up</p>
      <p><span class="inline-block bg-gray-700 px-2 py-1 rounded mr-2">K</span> Move Down</p>
    </div>
  `;

  const readyButton = document.createElement("button");
  readyButton.className = "btn-primary w-full mt-4";
  readyButton.textContent = "Ready to Play";
  readyButton.disabled = true;

  gameControls.appendChild(controlsTitle);
  gameControls.appendChild(controlsList);
  gameControls.appendChild(readyButton);

  const sidebar = document.createElement("div");
  sidebar.className = "w-full lg:w-1/4";

  const playersCard = document.createElement("div");
  playersCard.className = "bg-background-light rounded-lg p-6 mb-6";

  const playersTitle = document.createElement("h2");
  playersTitle.className = "text-xl font-bold mb-4";
  playersTitle.textContent = "Players";

  const playersList = document.createElement("div");
  playersList.className = "space-y-4";

  playersCard.appendChild(playersTitle);
  playersCard.appendChild(playersList);

  const chatContainer = document.createElement("div");
  chatContainer.className = "bg-background-light rounded-lg p-6";
  chatContainer.innerHTML = '<h2 class="text-xl font-bold mb-4">Live Chat</h2>';

  gameSection.appendChild(gameHeader);
  gameSection.appendChild(gameContainer);
  gameSection.appendChild(gameControls);

  sidebar.appendChild(playersCard);
  sidebar.appendChild(chatContainer);

  container.appendChild(gameSection);
  container.appendChild(sidebar);

  const initializeGame = async (id: string) => {
    if (!authContext.isAuthenticated()) {
      window.location.href = "/login";
      return;
    }

    gameTitle.textContent = `Game #${id}`;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${backendUrl}/api/games/${id}`, {
        headers: {
          Authorization: `Bearer ${authContext.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load game");
      }

      const data = await response.json();
      gameState = data.game;

      checkTournamentMatch(id);

      updateGameStatus(gameState.status);

      updatePlayersInfo(gameState);

      const isPlayer: boolean = Boolean(user && (gameState.player1_id === user.id || gameState.player2_id === user.id));
      gameComponent = createPongGame({
        isPlayer,
        gameId: id,
        userId: user?.id,
        onReady: handlePlayerReady,
      });

      gameContainer.innerHTML = "";
      gameContainer.appendChild(gameComponent);

      readyButton.disabled = !isPlayer;
      if (isPlayer) {
        readyButton.addEventListener("click", handlePlayerReady);
      } else {
        readyButton.textContent = "Spectating";
      }

      chatComponent = createChat({
        roomId: `game:${id}`,
        userId: user?.id || 0,
        username: user?.username || "Guest",
      });

      chatContainer.innerHTML = "";
      chatContainer.appendChild(chatComponent);

      joinGame(id);
    } catch (error) {
      console.error("Error loading game:", error);
      gameContainer.innerHTML = `
        <div class="text-center py-12">
          <p class="text-red-500 mb-4">Failed to load game</p>
          <button class="btn-primary" id="retry-button">Retry</button>
        </div>
      `;

      const retryButton = document.getElementById("retry-button");
      if (retryButton) {
        retryButton.addEventListener("click", () => {
          initializeGame(id);
        });
      }
    }
  };

  const params = (window as any).__ROUTE_PARAMS__ || {};
  if (params.id) {
    gameId = params.id;
    initializeGame(params.id);
  }

  const joinGame = (id: string) => {
    const socket = getSocketInstance();

    if (!socket || !user) {
      console.error("Socket or user not available");
      updateGameStatus("error");
      gameContainer.innerHTML = `
        <div class="text-center py-12">
          <p class="text-red-500 mb-4">Socket connection error</p>
          <p class="mb-4">Please try refreshing the page</p>
          <button class="btn-primary" id="refresh-button">Refresh</button>
        </div>
      `;

      const refreshButton = document.getElementById("refresh-button");
      if (refreshButton) {
        refreshButton.addEventListener("click", () => {
          window.location.reload();
        });
      }
      return;
    }

    console.log("Joining game room:", { gameId: id, userId: user.id });
    emit("game:join", { gameId: id, userId: user.id });

    readyButton.disabled = false;
    readyButton.className = "btn-primary w-full mt-4";

    const unsubscribeState = on("game:state", (state: any) => {
      if (state.id === id) {
        gameState = state;
        updateGameStatus(state.status);
      }
    });

    const unsubscribeStart = on("game:start", (data: any) => {
      console.log("Game started!", data);

      updateGameStatus("playing");

      gameContainer.classList.add("game-active");

      const statusIndicators = gameControls.querySelectorAll(".text-sm.text-center.text-green-500");
      statusIndicators.forEach((indicator) => indicator.remove());

      readyButton.style.display = "none";

      const gameStartAlert = document.createElement("div");
      gameStartAlert.className = "bg-green-500 text-white px-4 py-2 rounded-lg mb-4 text-center font-bold";
      gameStartAlert.textContent = "Game is now LIVE! Use controls to play.";

      gameSection.insertBefore(gameStartAlert, gameContainer);

      setTimeout(() => {
        gameStartAlert.remove();
      }, 5000);
    });

    const unsubscribeEnd = on("game:end", (data: any) => {
      if (data.game.id === id) {
        updateGameStatus("finished");
        showGameResult(data);
      }
    });

    const cleanup = () => {
      unsubscribeState();
      unsubscribeStart();
      unsubscribeEnd();
    };

    window.addEventListener("beforeunload", cleanup);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === container) {
            cleanup();
            window.removeEventListener("beforeunload", cleanup);
            observer.disconnect();
          }
        });
      });
    });

    if (container.parentElement) {
      observer.observe(container.parentElement, { childList: true });
    }
  };

  const handlePlayerReady = () => {
    if (!gameId || !user) {
      console.error("Cannot ready up: gameId or user missing", { gameId, user });
      return;
    }

    console.log("Player ready, sending event:", { gameId, userId: user.id });
    emit("game:ready", { gameId, userId: user.id });

    readyButton.textContent = "Waiting for opponent...";
    readyButton.disabled = true;
    readyButton.classList.add("opacity-70");

    const existingIndicators = gameControls.querySelectorAll(".text-sm.text-center.text-green-500");
    existingIndicators.forEach((indicator) => indicator.remove());

    const statusIndicator = document.createElement("div");
    statusIndicator.className = "mt-2 text-sm text-center text-green-500";
    statusIndicator.textContent = "You are ready! Waiting for opponent...";
    statusIndicator.id = "ready-status-indicator";
    gameControls.appendChild(statusIndicator);
  };

  const updateGameStatus = (status: string) => {
    gameStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);

    switch (status) {
      case "pending":
        gameStatus.className = "px-3 py-1 rounded-full text-sm bg-yellow-600";
        break;
      case "active":
      case "playing":
        gameStatus.className = "px-3 py-1 rounded-full text-sm bg-green-600";
        break;
      case "finished":
        gameStatus.className = "px-3 py-1 rounded-full text-sm bg-blue-600";
        break;
      default:
        gameStatus.className = "px-3 py-1 rounded-full text-sm bg-gray-600";
    }
  };

  const checkTournamentMatch = async (gameId: string) => {
    try {
      console.log("Checking if game is part of tournament:", gameId);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";

      const response = await fetch(`${backendUrl}/api/tournament/public/match/${gameId}`);

      console.log("Tournament match API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Tournament match API response data:", data);

        if (data.tournamentMatch) {
          console.log("This game is part of tournament:", data.tournamentMatch);

          window.localStorage.setItem("currentTournamentId", data.tournamentMatch.tournament_id);
          window.localStorage.setItem("currentTournamentRound", data.tournamentMatch.round);
          window.localStorage.setItem("currentTournamentMatchOrder", data.tournamentMatch.match_order);

          if (gameState) {
            gameState.tournamentId = data.tournamentMatch.tournament_id;
            gameState.tournamentRound = data.tournamentMatch.round;
            gameState.tournamentMatchOrder = data.tournamentMatch.match_order;
            console.log("Updated gameState with tournament info:", gameState);
          } else {
            console.warn("gameState is not initialized yet");
          }
        } else {
          console.log("This game is not part of any tournament");
          window.localStorage.removeItem("currentTournamentId");
        }
      } else {
        console.warn("Tournament match API returned error:", await response.text());
        if (authContext.isAuthenticated()) {
          console.log("Retrying with authenticated API endpoint");
          const authResponse = await fetch(`${backendUrl}/api/tournament/match/${gameId}`, {
            headers: {
              Authorization: `Bearer ${authContext.getToken()}`,
            },
          });

          if (authResponse.ok) {
            const authData = await authResponse.json();
            if (authData.tournamentMatch) {
              gameState.tournamentId = authData.tournamentMatch.tournament_id;
              window.localStorage.setItem("currentTournamentId", authData.tournamentMatch.tournament_id);
              console.log("Got tournament info from authenticated API:", authData.tournamentMatch);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking tournament match:", error);
    }
  };

  const updatePlayersInfo = (game: any) => {
    playersList.innerHTML = "";

    const player1Card = document.createElement("div");
    player1Card.className = "flex items-center justify-between";

    const player1Info = document.createElement("div");
    player1Info.className = "flex items-center";

    const player1Avatar = document.createElement("div");
    player1Avatar.className = "w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-3";
    player1Avatar.textContent = game.player1_name.charAt(0).toUpperCase();

    const player1Name = document.createElement("div");
    player1Name.innerHTML = `
      <p class="font-medium">${game.player1_name}</p>
      <p class="text-xs text-gray-400">Player 1</p>
    `;

    const player1Score = document.createElement("div");
    player1Score.className = "text-xl font-bold";
    player1Score.textContent = String(game.player1_score || "0");
    player1Score.id = "player1-score";

    player1Info.appendChild(player1Avatar);
    player1Info.appendChild(player1Name);

    player1Card.appendChild(player1Info);
    player1Card.appendChild(player1Score);

    const player2Card = document.createElement("div");
    player2Card.className = "flex items-center justify-between";

    const player2Info = document.createElement("div");
    player2Info.className = "flex items-center";

    const player2Avatar = document.createElement("div");
    player2Avatar.className = "w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-3";
    player2Avatar.textContent = game.player2_name.charAt(0).toUpperCase();

    const player2Name = document.createElement("div");
    player2Name.innerHTML = `
      <p class="font-medium">${game.player2_name}</p>
      <p class="text-xs text-gray-400">Player 2</p>
    `;

    const player2Score = document.createElement("div");
    player2Score.className = "text-xl font-bold";
    player2Score.textContent = String(game.player2_score || "0");
    player2Score.id = "player2-score";

    player2Info.appendChild(player2Avatar);
    player2Info.appendChild(player2Name);

    player2Card.appendChild(player2Info);
    player2Card.appendChild(player2Score);

    playersList.appendChild(player1Card);

    const divider = document.createElement("div");
    divider.className = "flex items-center my-2";
    divider.innerHTML = `
      <div class="flex-1 border-t border-gray-600"></div>
      <div class="px-2 text-gray-400">VS</div>
      <div class="flex-1 border-t border-gray-600"></div>
    `;

    playersList.appendChild(divider);
    playersList.appendChild(player2Card);
  };

  const showGameResult = (data: any) => {
    try {
      console.log("showGameResult called with data:", data);
      const { winner, player1Score, player2Score } = data;

      const score1Element = document.getElementById("player1-score");
      const score2Element = document.getElementById("player2-score");
      if (score1Element) score1Element.textContent = String(player1Score);
      if (score2Element) score2Element.textContent = String(player2Score);

      console.log("Tournament info available:", {
        gameState: gameState,
        gameStateId: gameState?.id,
        gameStateTournamentId: gameState?.tournamentId,
        localStorage: {
          currentTournamentId: window.localStorage.getItem("currentTournamentId"),
        },
      });

      const tournamentId = "8";

      const modal = document.createElement("div");
      modal.className = "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

      const modalContent = document.createElement("div");
      modalContent.className = "bg-background-light p-8 rounded-lg max-w-md w-full";

      const resultTitle = document.createElement("h2");
      resultTitle.className = "text-2xl font-bold mb-4 text-center";
      resultTitle.textContent = "Game Over";

      const resultMessage = document.createElement("p");
      resultMessage.className = "text-center text-lg mb-6";
      const winnerName = winner === gameState.player1_id ? gameState.player1_name : gameState.player2_name;
      resultMessage.textContent = `${winnerName} wins the game!`;

      const scoreDisplay = document.createElement("div");
      scoreDisplay.className = "flex justify-around mb-6";
      scoreDisplay.innerHTML = `
        <div class="text-center">
          <p class="text-gray-400">Player 1</p>
          <p class="text-2xl font-bold">${player1Score}</p>
          <p class="text-sm">${gameState.player1_name}</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400">Player 2</p>
          <p class="text-2xl font-bold">${player2Score}</p>
          <p class="text-sm">${gameState.player2_name}</p>
        </div>
      `;

      const updateMessage = document.createElement("p");
      updateMessage.className = "text-center text-sm text-green-500 mb-4";
      updateMessage.textContent = "結果がトーナメントに反映されました";
      modalContent.appendChild(updateMessage);

      const buttonContainer = document.createElement("div");
      buttonContainer.className = "flex justify-center gap-4 flex-wrap";

      const tournamentButton = document.createElement("button");
      tournamentButton.className = "btn-primary";
      tournamentButton.textContent = "トーナメントに戻る";
      tournamentButton.addEventListener("click", () => {
        window.location.href = `/tournament/${tournamentId}`;
      });
      buttonContainer.appendChild(tournamentButton);

      const homeButton = document.createElement("button");
      homeButton.className = "btn-outline";
      homeButton.textContent = "Back to Home";
      homeButton.addEventListener("click", () => {
        window.location.href = "/";
      });
      buttonContainer.appendChild(homeButton);

      modalContent.appendChild(resultTitle);
      modalContent.appendChild(resultMessage);
      modalContent.appendChild(scoreDisplay);
      modalContent.appendChild(buttonContainer);
      modal.appendChild(modalContent);

      document.body.appendChild(modal);

      console.log("Game result modal with tournament button displayed");
    } catch (error) {
      console.error("Error displaying game result:", error);
      window.location.href = "/";
    }
  };

  gameSection.appendChild(gameHeader);
  gameSection.appendChild(gameContainer);
  gameSection.appendChild(gameControls);

  sidebar.appendChild(playersCard);
  sidebar.appendChild(chatContainer);

  container.appendChild(gameSection);
  container.appendChild(sidebar);

  const pathParts = window.location.pathname.split("/");
  gameId = pathParts[pathParts.length - 1];

  if (gameId) {
    setTimeout(() => {
      initializeGame(gameId);
    }, 0);
  }

  return container;
}
