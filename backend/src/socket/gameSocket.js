'use strict'

const { db } = require('../database/db')

// Game constants
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const PADDLE_HEIGHT = 100
const PADDLE_WIDTH = 10
const BALL_SIZE = 10
const PADDLE_SPEED = 10
const BALL_SPEED = 5
const POINTS_TO_WIN = 5

module.exports = function(io) {
  // Store active games
  const activeGames = new Map()

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)
    
    // Join user's personal room for direct messages
    if (socket.handshake.auth && socket.handshake.auth.userId) {
      const userId = socket.handshake.auth.userId
      socket.join(`user:${userId}`)
      socket.userId = userId
      
      console.log(`User ${userId} connected and joined personal room`)
      
      // Update user status to online
      db.run('UPDATE users SET status = ? WHERE id = ?', ['online', userId])
    }

    // Handle game join
    socket.on('game:join', async (data) => {
      try {
        const { gameId, userId } = data
        
        if (!gameId || !userId) {
          return socket.emit('error', { message: 'Game ID and User ID are required' })
        }
        
        // Join game room
        socket.join(`game:${gameId}`)
        console.log(`User ${userId} joined game ${gameId}`)
        
        // Get game from database
        const game = await new Promise((resolve, reject) => {
          db.get(`
            SELECT g.*,
              u1.username as player1_name,
              u2.username as player2_name
            FROM games g
            JOIN users u1 ON g.player1_id = u1.id
            JOIN users u2 ON g.player2_id = u2.id
            WHERE g.id = ?
          `, [gameId], (err, row) => {
            if (err) reject(err)
            resolve(row)
          })
        })
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' })
          return
        }
        
        // Check if user is part of the game
        if (game.player1_id !== userId && game.player2_id !== userId) {
          socket.emit('error', { message: 'Not authorized to join this game' })
          return
        }
        
        // Initialize game state if not already active
        if (!activeGames.has(gameId)) {
          activeGames.set(gameId, {
            id: gameId,
            player1: {
              id: game.player1_id,
              y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
              score: 0,
              ready: false
            },
            player2: {
              id: game.player2_id,
              y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
              score: 0,
              ready: false
            },
            ball: {
              x: CANVAS_WIDTH / 2,
              y: CANVAS_HEIGHT / 2,
              dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
              dy: BALL_SPEED * (Math.random() * 2 - 1)
            },
            status: 'waiting',
            lastUpdateTime: Date.now()
          })
          
          // Update game status in database to match memory state
          db.run('UPDATE games SET status = ? WHERE id = ?', ['waiting', gameId], (err) => {
            if (err) {
              console.error('Error updating game status to waiting:', err)
            } else {
              console.log(`Game ${gameId} status updated to waiting in database`)
            }
          })
        }
        
        // Emit current game state
        io.to(`game:${gameId}`).emit('game:state', activeGames.get(gameId))
      } catch (error) {
        console.error('Error in game:join:', error)
        socket.emit('error', { message: 'Server error while joining game' })
      }
    })
    
    // Handle player ready
    socket.on('game:ready', async (data) => {
      try {
        const { gameId, userId } = data
        
        if (!activeGames.has(gameId)) {
          return socket.emit('error', { message: 'Game not found' })
        }
        
        const gameState = activeGames.get(gameId)
        
        // Set player ready state
        if (gameState.player1.id === userId) {
          gameState.player1.ready = true
          console.log(`Player 1 (${userId}) is now ready in game ${gameId}`)
        } else if (gameState.player2.id === userId) {
          gameState.player2.ready = true
          console.log(`Player 2 (${userId}) is now ready in game ${gameId}`)
        } else {
          return socket.emit('error', { message: 'Not part of this game' })
        }
        
        // Log the current game state
        console.log(`Game ${gameId} state:`, {
          status: gameState.status,
          player1Ready: gameState.player1.ready,
          player2Ready: gameState.player2.ready
        })
        
        // Check if both players are ready
        console.log(`Checking game ${gameId} start conditions:`, {
          player1Ready: gameState.player1.ready,
          player2Ready: gameState.player2.ready,
          gameStatus: gameState.status
        })
        
        // Start the game if both players are ready (regardless of current status to fix any state issues)
        if (gameState.player1.ready && gameState.player2.ready && gameState.status !== 'playing') {
          gameState.status = 'playing'
          
          // Update game status in database
          db.run('UPDATE games SET status = ? WHERE id = ?', ['active', gameId], (err) => {
            if (err) {
              console.error('Error updating game status to active:', err)
            } else {
              console.log(`Game ${gameId} status updated to active in database`)
              
              // Emit game start event after database update
              io.to(`game:${gameId}`).emit('game:start', { message: 'Game started!' })
              
              // Start game loop
              startGameLoop(gameId)
            }
          })
        }
        
        // Emit updated game state
        io.to(`game:${gameId}`).emit('game:state', gameState)
      } catch (error) {
        console.error('Error in game:ready:', error)
        socket.emit('error', { message: 'Server error' })
      }
    })
    
    // Handle paddle movement
    socket.on('game:paddle_move', (data) => {
      const { gameId, userId, direction } = data
      
      if (!activeGames.has(gameId)) {
        return
      }
      
      const gameState = activeGames.get(gameId)
      
      // Only allow moves during active game
      if (gameState.status !== 'playing') {
        return
      }
      
      // Update paddle position
      if (gameState.player1.id === userId) {
        const newY = gameState.player1.y + direction * PADDLE_SPEED
        gameState.player1.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newY))
      } else if (gameState.player2.id === userId) {
        const newY = gameState.player2.y + direction * PADDLE_SPEED
        gameState.player2.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newY))
      }
    })
    
    // Handle spectate game
    socket.on('game:spectate', async (gameId) => {
      socket.join(`game:${gameId}`)
      console.log(`User spectating game ${gameId}`)
      
      if (activeGames.has(gameId)) {
        socket.emit('game:state', activeGames.get(gameId))
      } else {
        // Get game from database if not active
        try {
          const game = await new Promise((resolve, reject) => {
            db.get(`
              SELECT g.*,
                u1.username as player1_name,
                u2.username as player2_name
              FROM games g
              JOIN users u1 ON g.player1_id = u1.id
              JOIN users u2 ON g.player2_id = u2.id
              WHERE g.id = ?
            `, [gameId], (err, row) => {
              if (err) reject(err)
              resolve(row)
            })
          })
          
          if (game) {
            socket.emit('game:info', game)
          } else {
            socket.emit('error', { message: 'Game not found' })
          }
        } catch (error) {
          console.error('Error in game:spectate:', error)
          socket.emit('error', { message: 'Server error' })
        }
      }
    })
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
      
      // Update user status to offline
      if (socket.userId) {
        db.run('UPDATE users SET status = ? WHERE id = ?', ['offline', socket.userId])
      }
      
      // Handle disconnect in active games
      activeGames.forEach((gameState, gameId) => {
        if (
          (gameState.player1.id === socket.userId || gameState.player2.id === socket.userId) && 
          gameState.status === 'playing'
        ) {
          const winner = gameState.player1.id === socket.userId ? gameState.player2.id : gameState.player1.id
          endGame(gameId, winner, 'disconnect')
        }
      })
    })
  })

  // Game loop for active games
  function startGameLoop(gameId) {
    const gameState = activeGames.get(gameId)
    if (!gameState) return
    
    const frameRate = 60
    const frameInterval = 1000 / frameRate
    
    const gameInterval = setInterval(() => {
      if (!activeGames.has(gameId)) {
        clearInterval(gameInterval)
        return
      }
      
      const gameState = activeGames.get(gameId)
      
      // Only update if game is playing
      if (gameState.status !== 'playing') {
        return
      }
      
      updateGameState(gameState)
      
      // Send game state to clients
      io.to(`game:${gameId}`).emit('game:state', gameState)
      
      // Check if game is over
      if (gameState.player1.score >= POINTS_TO_WIN) {
        endGame(gameId, gameState.player1.id, 'score')
        clearInterval(gameInterval)
      } else if (gameState.player2.score >= POINTS_TO_WIN) {
        endGame(gameId, gameState.player2.id, 'score')
        clearInterval(gameInterval)
      }
    }, frameInterval)
  }
  
  // Update game state (ball position, collisions, score)
  function updateGameState(gameState) {
    const now = Date.now()
    const deltaTime = now - gameState.lastUpdateTime
    gameState.lastUpdateTime = now
    
    // Apply time-based movement
    const timeScale = deltaTime / (1000 / 60) // Normalize to 60fps
    
    // Update ball position
    gameState.ball.x += gameState.ball.dx * timeScale
    gameState.ball.y += gameState.ball.dy * timeScale
    
    // Ball collision with top/bottom walls
    if (gameState.ball.y <= 0 || gameState.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      gameState.ball.dy = -gameState.ball.dy
      gameState.ball.y = gameState.ball.y <= 0 ? 0 : CANVAS_HEIGHT - BALL_SIZE
    }
    
    // Ball collision with left paddle
    if (
      gameState.ball.x <= PADDLE_WIDTH && 
      gameState.ball.y + BALL_SIZE >= gameState.player1.y && 
      gameState.ball.y <= gameState.player1.y + PADDLE_HEIGHT
    ) {
      // Calculate bounce angle based on where ball hit paddle
      const hitPos = (gameState.ball.y - gameState.player1.y) / PADDLE_HEIGHT
      const bounceAngle = (hitPos - 0.5) * Math.PI / 2 // -45 to 45 degrees
      
      gameState.ball.dx = BALL_SPEED * Math.cos(bounceAngle)
      gameState.ball.dy = BALL_SPEED * Math.sin(bounceAngle)
      gameState.ball.x = PADDLE_WIDTH
    }
    
    // Ball collision with right paddle
    if (
      gameState.ball.x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE && 
      gameState.ball.y + BALL_SIZE >= gameState.player2.y && 
      gameState.ball.y <= gameState.player2.y + PADDLE_HEIGHT
    ) {
      // Calculate bounce angle based on where ball hit paddle
      const hitPos = (gameState.ball.y - gameState.player2.y) / PADDLE_HEIGHT
      const bounceAngle = (hitPos - 0.5) * Math.PI / 2 // -45 to 45 degrees
      
      gameState.ball.dx = -BALL_SPEED * Math.cos(bounceAngle)
      gameState.ball.dy = BALL_SPEED * Math.sin(bounceAngle)
      gameState.ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE
    }
    
    // Ball out of bounds (scoring)
    if (gameState.ball.x < 0) {
      // Player 2 scores
      gameState.player2.score++
      resetBall(gameState, -1)
    } else if (gameState.ball.x > CANVAS_WIDTH) {
      // Player 1 scores
      gameState.player1.score++
      resetBall(gameState, 1)
    }
  }
  
  // Reset ball after scoring
  function resetBall(gameState, direction) {
    gameState.ball.x = CANVAS_WIDTH / 2
    gameState.ball.y = CANVAS_HEIGHT / 2
    gameState.ball.dx = BALL_SPEED * direction
    gameState.ball.dy = BALL_SPEED * (Math.random() * 2 - 1)
  }
  
  // End game and update database
  async function endGame(gameId, winnerId, reason) {
    const gameState = activeGames.get(gameId)
    if (!gameState) return
    
    gameState.status = 'finished'
    gameState.winner = winnerId
    gameState.endReason = reason
    
    // Update game in database
    try {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE games SET status = ?, player1_score = ?, player2_score = ? WHERE id = ?',
          ['finished', gameState.player1.score, gameState.player2.score, gameId],
          function (err) {
            if (err) reject(err)
            resolve()
          }
        )
      })
      
      // Get updated game details
      const game = await new Promise((resolve, reject) => {
        db.get(`
          SELECT g.*,
            u1.username as player1_name,
            u2.username as player2_name
          FROM games g
          JOIN users u1 ON g.player1_id = u1.id
          JOIN users u2 ON g.player2_id = u2.id
          WHERE g.id = ?
        `, [gameId], (err, row) => {
          if (err) reject(err)
          resolve(row)
        })
      })
      
      // Emit game end event
      io.to(`game:${gameId}`).emit('game:end', {
        game,
        winner: winnerId,
        player1Score: gameState.player1.score,
        player2Score: gameState.player2.score,
        reason
      })
      
      // Remove game from active games after a delay
      setTimeout(() => {
        activeGames.delete(gameId)
      }, 60000) // Keep game state for 1 minute for post-game recap
    } catch (error) {
      console.error('Error ending game:', error)
    }
  }
}
