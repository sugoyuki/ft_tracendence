"use strict";

const { db } = require("../database/db");

async function routes(fastify, options) {
  fastify.post("/", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { player2Id } = request.body;
    const player1Id = request.user.id;

    if (!player2Id) {
      return reply.code(400).send({ error: "Second player ID is required" });
    }

    if (player1Id === player2Id) {
      return reply.code(400).send({ error: "Cannot create a game with yourself" });
    }

    try {
      const player2Exists = await new Promise((resolve, reject) => {
        db.get("SELECT id FROM users WHERE id = ?", [player2Id], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!player2Exists) {
        return reply.code(404).send({ error: "Second player not found" });
      }

      const gameId = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO games (player1_id, player2_id, status) VALUES (?, ?, ?)",
          [player1Id, player2Id, "pending"],
          function (err) {
            if (err) reject(err);
            resolve(this.lastID);
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

      // Notify specific players
      fastify.io.to(`user:${player1Id}`).to(`user:${player2Id}`).emit("game:created", game);
      
      // Broadcast to all clients for real-time updates
      fastify.io.emit("game:created", game);
      fastify.log.info(`Game ${gameId} created and broadcasted to all clients`);

      return reply.code(201).send({ game });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/:id", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;

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
          [id],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (!game) {
        return reply.code(404).send({ error: "Game not found" });
      }

      return reply.send({ game });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.put("/:id", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { status, player1Score, player2Score } = request.body;

    try {
      const game = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM games WHERE id = ?", [id], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!game) {
        return reply.code(404).send({ error: "Game not found" });
      }

      if (game.player1_id !== request.user.id && game.player2_id !== request.user.id) {
        return reply.code(403).send({ error: "Not authorized to update this game" });
      }

      const updateFields = [];
      const values = [];

      if (status) {
        updateFields.push("status = ?");
        values.push(status);
      }

      if (player1Score !== undefined) {
        updateFields.push("player1_score = ?");
        values.push(player1Score);
      }

      if (player2Score !== undefined) {
        updateFields.push("player2_score = ?");
        values.push(player2Score);
      }

      if (updateFields.length === 0) {
        return reply.code(400).send({ error: "No fields to update" });
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      await new Promise((resolve, reject) => {
        db.run(`UPDATE games SET ${updateFields.join(", ")} WHERE id = ?`, values, function (err) {
          if (err) reject(err);
          resolve(this.changes);
        });
      });

      const updatedGame = await new Promise((resolve, reject) => {
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
          [id],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      fastify.io.to(`game:${id}`).emit("game:updated", updatedGame);

      return reply.send({ game: updatedGame });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const games = await new Promise((resolve, reject) => {
        db.all(
          `
          SELECT g.*,
            u1.username as player1_name,
            u2.username as player2_name
          FROM games g
          JOIN users u1 ON g.player1_id = u1.id
          JOIN users u2 ON g.player2_id = u2.id
          WHERE g.status IN ('pending', 'active')
          ORDER BY g.created_at DESC
        `,
          (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          }
        );
      });

      return reply.send({ games });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}

module.exports = routes;
