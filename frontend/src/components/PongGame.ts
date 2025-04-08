import { emit, on } from '../services/socketService';

interface PongGameProps {
  isPlayer: boolean;
  gameId: string;
  userId?: number;
  onReady?: () => void;
}

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const POINTS_TO_WIN = 5;

export function createPongGame(props: PongGameProps): HTMLElement {
  const { isPlayer, gameId, userId, onReady } = props;
  
  // Create container
  const container = document.createElement('div');
  container.className = 'relative w-full';
  
  // Create canvas with fixed dimensions
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.className = 'bg-black max-w-full h-auto block mx-auto';
  
  // Game state
  let gameState: any = null;
  let animationFrameId: number | null = null;
  let keysPressed: Record<string, boolean> = {};
  let lastPaddleUpdate = 0;
  let isGameStarted = false;
  
  // Create overlay for game messages
  const overlay = document.createElement('div');
  overlay.className = 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10';
  
  const overlayMessage = document.createElement('div');
  overlayMessage.className = 'text-center px-6 py-4 rounded-lg bg-background-dark bg-opacity-90';
  
  if (isPlayer) {
    overlayMessage.innerHTML = `
      <h3 class="text-2xl font-bold mb-2">Get Ready!</h3>
      <p class="text-lg mb-4">Press the "Ready to Play" button when you're ready to start.</p>
      <p class="text-sm mb-2">Controls:</p>
      <p class="text-sm">Player 1: W (up) and S (down)</p>
      <p class="text-sm">Player 2: ↑ (up) and ↓ (down)</p>
    `;
  } else {
    overlayMessage.innerHTML = `
      <h3 class="text-2xl font-bold mb-2">Spectator Mode</h3>
      <p class="text-lg">Waiting for players to start the game...</p>
    `;
  }
  
  overlay.appendChild(overlayMessage);
  
  // Append canvas and overlay
  container.appendChild(canvas);
  container.appendChild(overlay);
  
  // Get drawing context
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Could not get canvas context');
    return container;
  }
  
  // Listen for keyboard events if player
  if (isPlayer) {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }
  
  // Setup socket event listeners
  setupSocketListeners();
  
  // Rendering game state
  function render() {
    if (!ctx || !gameState) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    ctx.strokeStyle = 'white';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw paddles
    ctx.fillStyle = '#4b9bff'; // Player 1 - Blue
    ctx.fillRect(0, gameState.player1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    ctx.fillStyle = '#10b981'; // Player 2 - Green
    ctx.fillRect(canvas.width - PADDLE_WIDTH, gameState.player2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // Draw ball
    ctx.fillStyle = 'white';
    ctx.fillRect(gameState.ball.x, gameState.ball.y, BALL_SIZE, BALL_SIZE);
    
    // Draw scores
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    
    // Player 1 score
    ctx.fillText(
      String(gameState.player1.score),
      canvas.width / 4,
      50
    );
    
    // Player 2 score
    ctx.fillText(
      String(gameState.player2.score),
      (canvas.width / 4) * 3,
      50
    );
    
    // Request next frame
    animationFrameId = requestAnimationFrame(render);
  }
  
  // Handle keyboard input
  function handleKeyDown(event: KeyboardEvent) {
    if (!isPlayer || !gameState || gameState.status !== 'playing') return;
    
    const key = event.key.toLowerCase();
    keysPressed[key] = true;
    
    // Send paddle movement based on player number
    if (userId === gameState.player1.id) {
      // Player 1: W and S
      if (key === 'w' || key === 's') {
        sendPaddleMove(key === 'w' ? -1 : 1);
      }
    } else if (userId === gameState.player2.id) {
      // Player 2: Up and Down arrows
      if (key === 'arrowup' || key === 'arrowdown') {
        sendPaddleMove(key === 'arrowup' ? -1 : 1);
      }
    }
  }
  
  function handleKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    keysPressed[key] = false;
  }
  
  // Throttled paddle movement
  function sendPaddleMove(direction: number) {
    const now = Date.now();
    if (now - lastPaddleUpdate > 33) { // Limit to ~30 updates per second
      emit('game:paddle_move', {
        gameId,
        userId,
        direction
      });
      lastPaddleUpdate = now;
    }
  }
  
  // Setup socket event listeners
  function setupSocketListeners() {
    // Game state updates
    const unsubscribeState = on('game:state', (state: any) => {
      if (state.id !== gameId) return;
      
      gameState = state;
      
      // Start rendering if not already started
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
      }
      
      // Hide overlay when game is playing
      if (state.status === 'playing' && !isGameStarted) {
        overlay.style.display = 'none';
        isGameStarted = true;
      } else if (state.status === 'finished') {
        // Show game over on finish
        showGameOver();
      }
    });
    
    // Game start event
    const unsubscribeStart = on('game:start', () => {
      overlay.style.display = 'none';
      isGameStarted = true;
    });
    
    // Game end event
    const unsubscribeEnd = on('game:end', () => {
      showGameOver();
    });
    
    // Add cleanup method to container
    container.cleanup = () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      unsubscribeState();
      unsubscribeStart();
      unsubscribeEnd();
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }
  
  // Show game over message
  function showGameOver() {
    if (!gameState) return;
    
    // Cancel animation loop
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    // Determine winner
    let winnerText = '';
    if (gameState.player1.score >= POINTS_TO_WIN) {
      winnerText = 'Player 1 Wins!';
    } else if (gameState.player2.score >= POINTS_TO_WIN) {
      winnerText = 'Player 2 Wins!';
    } else {
      winnerText = 'Game Over';
    }
    
    // Draw final state
    if (ctx) {
      // Add semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw game over text
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(winnerText, canvas.width / 2, canvas.height / 2 - 24);
      
      // Draw final score
      ctx.font = 'bold 32px Arial';
      ctx.fillText(
        `${gameState.player1.score} - ${gameState.player2.score}`,
        canvas.width / 2,
        canvas.height / 2 + 24
      );
    }
  }
  
  // Emit spectate event if not a player
  if (!isPlayer) {
    emit('game:spectate', gameId);
  }
  
  return container;
}
