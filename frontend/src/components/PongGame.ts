import { emit, on } from "../services/socketService";

interface PongGameProps {
  isPlayer: boolean;
  gameId: string;
  userId?: number;
  onReady?: () => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const POINTS_TO_WIN = 5;

export function createPongGame(props: PongGameProps): HTMLElement {
  const { isPlayer, gameId, userId, onReady } = props;

  const container = document.createElement("div");
  container.className = "relative w-full";

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.className = "bg-black max-w-full h-auto block mx-auto";

  let gameState: any = null;
  let animationFrameId: number | null = null;
  let keysPressed: Record<string, boolean> = {};
  let lastPaddleUpdate = 0;
  let isGameStarted = false;

  const overlay = document.createElement("div");
  overlay.className = "absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10";

  const overlayMessage = document.createElement("div");
  overlayMessage.className = "text-center px-6 py-4 rounded-lg bg-background-dark bg-opacity-90";

  if (isPlayer) {
    overlayMessage.innerHTML = `
      <h3 class="text-2xl font-bold mb-2">Get Ready!</h3>
      <p class="text-lg mb-4">Press the "Ready to Play" button when you're ready to start.</p>
      <p class="text-sm mb-2">Controls:</p>
      <p class="text-sm">Player 1: W (up) and S (down)</p>
      <p class="text-sm">Player 2: I (up) and K (down)</p>
    `;
  } else {
    overlayMessage.innerHTML = `
      <h3 class="text-2xl font-bold mb-2">Spectator Mode</h3>
      <p class="text-lg">Waiting for players to start the game...</p>
    `;
  }

  overlay.appendChild(overlayMessage);

  container.appendChild(canvas);
  container.appendChild(overlay);

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Could not get canvas context");
    return container;
  }

  if (isPlayer) {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  }

  setupSocketListeners();

  function render() {
    if (!ctx || !gameState) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "white";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#4b9bff";
    ctx.fillRect(0, gameState.player1.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = "#10b981";
    ctx.fillRect(canvas.width - PADDLE_WIDTH, gameState.player2.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = "white";
    ctx.fillRect(gameState.ball.x, gameState.ball.y, BALL_SIZE, BALL_SIZE);

    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    ctx.fillText(String(gameState.player1.score), canvas.width / 4, 50);

    ctx.fillText(String(gameState.player2.score), (canvas.width / 4) * 3, 50);

    animationFrameId = requestAnimationFrame(render);
  }

  function handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    console.log("Key pressed:", key, "User ID:", userId);
    console.log("Game state:", gameState?.status, "isPlayer:", isPlayer);
    console.log("Player IDs - P1:", gameState?.player1?.id, "P2:", gameState?.player2?.id);

    if (key === "w" || key === "s" || key === "i" || key === "k") {
      console.log(`${key} key detected, attempting paddle move...`);
    }

    if (!isPlayer) {
      console.log("Key ignored: not a player");
      return;
    }

    if (!gameState) {
      console.log("Key ignored: game state not loaded");
      return;
    }

    if (gameState.status !== "playing") {
      console.log("Key ignored: game not in playing state, current state:", gameState.status);
      return;
    }

    keysPressed[key] = true;

    if (key === "w" || key === "s") {
      console.log("Sending paddle move for W/S key (Player 1)");
      sendPaddleMove(key === "w" ? -1 : 1, "player1");
      return;
    }

    if (key === "i" || key === "k") {
      console.log("Sending paddle move for I/K key (Player 2)");
      sendPaddleMove(key === "i" ? -1 : 1, "player2");
      return;
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    keysPressed[key] = false;
  }

  function sendPaddleMove(direction: number, playerType: "player1" | "player2") {
    const now = Date.now();
    if (now - lastPaddleUpdate > 33) {
      let playerIdToSend = userId;

      if (playerType === "player2" && gameState) {
        playerIdToSend = gameState.player2.id;
      } else if (playerType === "player1" && gameState) {
        playerIdToSend = gameState.player1.id;
      }

      console.log(`Sending paddle move for ${playerType} with ID ${playerIdToSend}. Direction: ${direction}`);

      emit("game:paddle_move", {
        gameId,
        userId: playerIdToSend,
        direction,
      });
      lastPaddleUpdate = now;
    }
  }

  function setupSocketListeners() {
    const unsubscribeState = on("game:state", (state: any) => {
      if (state.id !== gameId) return;

      gameState = state;

      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
      }

      if (state.status === "playing" && !isGameStarted) {
        overlay.style.display = "none";
        isGameStarted = true;
      } else if (state.status === "finished") {
        showGameOver();
      }
    });

    const unsubscribeStart = on("game:start", () => {
      overlay.style.display = "none";
      isGameStarted = true;
    });

    const unsubscribeEnd = on("game:end", () => {
      showGameOver();
    });

    container.cleanup = () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      unsubscribeState();
      unsubscribeStart();
      unsubscribeEnd();

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }

  function showGameOver() {
    if (!gameState) return;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    let winnerText = "";
    if (gameState.player1.score >= POINTS_TO_WIN) {
      winnerText = "Player 1 Wins!";
    } else if (gameState.player2.score >= POINTS_TO_WIN) {
      winnerText = "Player 2 Wins!";
    } else {
      winnerText = "Game Over";
    }

    if (ctx) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = "bold 48px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText(winnerText, canvas.width / 2, canvas.height / 2 - 24);

      ctx.font = "bold 32px Arial";
      ctx.fillText(`${gameState.player1.score} - ${gameState.player2.score}`, canvas.width / 2, canvas.height / 2 + 24);
    }
  }

  if (!isPlayer) {
    emit("game:spectate", gameId);
  }

  return container;
}
