"use strict";

const { db } = require("../database/db");

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const PADDLE_SPEED = 15;
const BALL_SPEED = 5;
const POINTS_TO_WIN = 5;

module.exports = function (io) {
  const activeGames = new Map();

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    if (socket.handshake.auth && socket.handshake.auth.userId) {
      const userId = socket.handshake.auth.userId;
      socket.join(`user:${userId}`);
      socket.userId = userId;

      console.log(`User ${userId} connected and joined personal room`);

      db.run("UPDATE users SET status = ? WHERE id = ?", ["online", userId]);
    }

    socket.on("game:join", async (data) => {
      try {
        const { gameId, userId } = data;

        if (!gameId || !userId) {
          return socket.emit("error", { message: "Game ID and User ID are required" });
        }

        socket.join(`game:${gameId}`);
        console.log(`User ${userId} joined game ${gameId}`);
        const game = await new Promise((resolve, reject) => {
          db.get(
            `
            SELECT g.*,
              u1.username as player1_name,
              u2.username as player2_name
            FROM games g
            JOIN users u1 ON g.player1_id = u1.id
            JOIN users u2 ON g.player2_id = u2.id
            WHERE g.id = ?
          `,
            [gameId],
            (err, row) => {
              if (err) reject(err);
              resolve(row);
            }
          );
        });

        if (!game) {
          socket.emit("error", { message: "Game not found" });
          return;
        }

        if (game.player1_id !== userId && game.player2_id !== userId) {
          socket.emit("error", { message: "Not authorized to join this game" });
          return;
        }

        if (!activeGames.has(gameId)) {
          activeGames.set(gameId, {
            id: gameId,
            player1: {
              id: game.player1_id,
              y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
              score: 0,
              ready: false,
            },
            player2: {
              id: game.player2_id,
              y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
              score: 0,
              ready: false,
            },
            ball: {
              x: CANVAS_WIDTH / 2,
              y: CANVAS_HEIGHT / 2,
              dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
              dy: BALL_SPEED * (Math.random() * 2 - 1),
            },
            status: "waiting",
            lastUpdateTime: Date.now(),
          });

          db.run("UPDATE games SET status = ? WHERE id = ?", ["waiting", gameId], (err) => {
            if (err) {
              console.error("Error updating game status to waiting:", err);
            } else {
              console.log(`Game ${gameId} status updated to waiting in database`);
            }
          });
        }

        io.to(`game:${gameId}`).emit("game:state", activeGames.get(gameId));
      } catch (error) {
        console.error("Error in game:join:", error);
        socket.emit("error", { message: "Server error while joining game" });
      }
    });

    socket.on("game:ready", async (data) => {
      try {
        const { gameId, userId } = data;

        if (!activeGames.has(gameId)) {
          return socket.emit("error", { message: "Game not found" });
        }

        const gameState = activeGames.get(gameId);

        if (gameState.player1.id === userId) {
          gameState.player1.ready = true;
          console.log(`Player 1 (${userId}) is now ready in game ${gameId}`);
        } else if (gameState.player2.id === userId) {
          gameState.player2.ready = true;
          console.log(`Player 2 (${userId}) is now ready in game ${gameId}`);
        } else {
          return socket.emit("error", { message: "Not part of this game" });
        }

        console.log(`Game ${gameId} state:`, {
          status: gameState.status,
          player1Ready: gameState.player1.ready,
          player2Ready: gameState.player2.ready,
        });

        console.log(`Checking game ${gameId} start conditions:`, {
          player1Ready: gameState.player1.ready,
          player2Ready: gameState.player2.ready,
          gameStatus: gameState.status,
        });

        if (gameState.player1.ready && gameState.player2.ready && gameState.status === "waiting") {
          // 状態を更新する前にログを記録
          console.log(`Both players are ready in game ${gameId}. Starting game...`);
          
          // メモリ内のゲームステータスを更新
          gameState.status = "playing";
          
          // データベースのステータスもplayingに揃える
          db.run("UPDATE games SET status = ? WHERE id = ?", ["playing", gameId], (err) => {
            if (err) {
              console.error("Error updating game status to playing:", err);
            } else {
              console.log(`Game ${gameId} status updated to playing in database`);
              
              // 正しく通知されたか確認するログ
              console.log(`Emitting game:start event to room game:${gameId}`);
              
              // すべてのクライアントにゲーム開始を通知
              io.to(`game:${gameId}`).emit("game:start", { 
                message: "Game started!",
                game: gameState
              });
              
              // ゲームループを開始
              startGameLoop(gameId);
            }
          });
        } else {
          console.log(`Game ${gameId} conditions not met for start:`, {
            player1Ready: gameState.player1.ready,
            player2Ready: gameState.player2.ready,
            gameStatus: gameState.status
          });
        }

        io.to(`game:${gameId}`).emit("game:state", gameState);
      } catch (error) {
        console.error("Error in game:ready:", error);
        socket.emit("error", { message: "Server error" });
      }
    });

    socket.on("game:paddle_move", (data) => {
      const { gameId, userId, direction } = data;

      if (!activeGames.has(gameId)) {
        return;
      }

      const gameState = activeGames.get(gameId);

      if (gameState.status !== "playing") {
        return;
      }

      if (gameState.player1.id === userId) {
        const newY = gameState.player1.y + direction * PADDLE_SPEED;
        gameState.player1.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newY));
      } else if (gameState.player2.id === userId) {
        const newY = gameState.player2.y + direction * PADDLE_SPEED;
        gameState.player2.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newY));
      }
    });

    socket.on("game:spectate", async (gameId) => {
      socket.join(`game:${gameId}`);
      console.log(`User spectating game ${gameId}`);

      if (activeGames.has(gameId)) {
        socket.emit("game:state", activeGames.get(gameId));
      } else {
        try {
          const game = await new Promise((resolve, reject) => {
            db.get(
              `
              SELECT g.*,
                u1.username as player1_name,
                u2.username as player2_name
              FROM games g
              JOIN users u1 ON g.player1_id = u1.id
              JOIN users u2 ON g.player2_id = u2.id
              WHERE g.id = ?
            `,
              [gameId],
              (err, row) => {
                if (err) reject(err);
                resolve(row);
              }
            );
          });

          if (game) {
            socket.emit("game:info", game);
          } else {
            socket.emit("error", { message: "Game not found" });
          }
        } catch (error) {
          console.error("Error in game:spectate:", error);
          socket.emit("error", { message: "Server error" });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      if (socket.userId) {
        db.run("UPDATE users SET status = ? WHERE id = ?", ["offline", socket.userId]);
      }

      activeGames.forEach((gameState, gameId) => {
        if (
          (gameState.player1.id === socket.userId || gameState.player2.id === socket.userId) &&
          gameState.status === "playing"
        ) {
          const winner = gameState.player1.id === socket.userId ? gameState.player2.id : gameState.player1.id;
          endGame(gameId, winner, "disconnect");
        }
      });
    });
  });

  function startGameLoop(gameId) {
    const gameState = activeGames.get(gameId);
    if (!gameState) return;

    const frameRate = 60;
    const frameInterval = 1000 / frameRate;

    const gameInterval = setInterval(() => {
      if (!activeGames.has(gameId)) {
        clearInterval(gameInterval);
        return;
      }

      const gameState = activeGames.get(gameId);

      if (gameState.status !== "playing") {
        return;
      }

      updateGameState(gameState);

      io.to(`game:${gameId}`).emit("game:state", gameState);

      if (gameState.player1.score >= POINTS_TO_WIN) {
        endGame(gameId, gameState.player1.id, "score");
        clearInterval(gameInterval);
      } else if (gameState.player2.score >= POINTS_TO_WIN) {
        endGame(gameId, gameState.player2.id, "score");
        clearInterval(gameInterval);
      }
    }, frameInterval);
  }

  function updateGameState(gameState) {
    const now = Date.now();
    const deltaTime = now - gameState.lastUpdateTime;
    gameState.lastUpdateTime = now;

    const timeScale = deltaTime / (1000 / 60);

    gameState.ball.x += gameState.ball.dx * timeScale;
    gameState.ball.y += gameState.ball.dy * timeScale;

    if (gameState.ball.y <= 0 || gameState.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      gameState.ball.dy = -gameState.ball.dy;
      gameState.ball.y = gameState.ball.y <= 0 ? 0 : CANVAS_HEIGHT - BALL_SIZE;
    }

    if (
      gameState.ball.x <= PADDLE_WIDTH &&
      gameState.ball.y + BALL_SIZE >= gameState.player1.y &&
      gameState.ball.y <= gameState.player1.y + PADDLE_HEIGHT
    ) {
      const hitPos = (gameState.ball.y - gameState.player1.y) / PADDLE_HEIGHT;
      const bounceAngle = ((hitPos - 0.5) * Math.PI) / 2;

      gameState.ball.dx = BALL_SPEED * Math.cos(bounceAngle);
      gameState.ball.dy = BALL_SPEED * Math.sin(bounceAngle);
      gameState.ball.x = PADDLE_WIDTH;
    }

    if (
      gameState.ball.x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
      gameState.ball.y + BALL_SIZE >= gameState.player2.y &&
      gameState.ball.y <= gameState.player2.y + PADDLE_HEIGHT
    ) {
      const hitPos = (gameState.ball.y - gameState.player2.y) / PADDLE_HEIGHT;
      const bounceAngle = ((hitPos - 0.5) * Math.PI) / 2;

      gameState.ball.dx = -BALL_SPEED * Math.cos(bounceAngle);
      gameState.ball.dy = BALL_SPEED * Math.sin(bounceAngle);
      gameState.ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;
    }

    if (gameState.ball.x < 0) {
      gameState.player2.score++;
      resetBall(gameState, -1);
    } else if (gameState.ball.x > CANVAS_WIDTH) {
      gameState.player1.score++;
      resetBall(gameState, 1);
    }
  }

  function resetBall(gameState, direction) {
    gameState.ball.x = CANVAS_WIDTH / 2;
    gameState.ball.y = CANVAS_HEIGHT / 2;
    gameState.ball.dx = BALL_SPEED * direction;
    gameState.ball.dy = BALL_SPEED * (Math.random() * 2 - 1);
  }

  async function endGame(gameId, winnerId, reason) {
    const gameState = activeGames.get(gameId);
    if (!gameState) return;

    gameState.status = "finished";
    gameState.winner = winnerId;
    gameState.endReason = reason;

    try {
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE games SET status = ?, player1_score = ?, player2_score = ? WHERE id = ?",
          ["finished", gameState.player1.score, gameState.player2.score, gameId],
          function (err) {
            if (err) reject(err);
            resolve();
          }
        );
      });

      const game = await new Promise((resolve, reject) => {
        db.get(
          `
          SELECT g.*,
            u1.username as player1_name,
            u2.username as player2_name
          FROM games g
          JOIN users u1 ON g.player1_id = u1.id
          JOIN users u2 ON g.player2_id = u2.id
          WHERE g.id = ?
        `,
          [gameId],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      io.to(`game:${gameId}`).emit("game:end", {
        game,
        winner: winnerId,
        player1Score: gameState.player1.score,
        player2Score: gameState.player2.score,
        reason,
      });

      setTimeout(() => {
        activeGames.delete(gameId);
      }, 60000);
    } catch (error) {
      console.error("Error ending game:", error);
    }
  }
};
