"use strict";

const { db } = require("../database/db");

async function routes(fastify, options) {
  fastify.get("/match/:gameId", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { gameId } = request.params;
    fastify.log.info(
      `[tournament-match] Authenticated user ${request.user.id} requested match info for game ${gameId}`
    );

    try {
      const tournamentMatch = await new Promise((resolve, reject) => {
        db.get(
          `SELECT tm.*, t.name as tournament_name
           FROM tournament_matches tm
           JOIN tournaments t ON tm.tournament_id = t.id
           WHERE tm.game_id = ?`,
          [gameId],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (!tournamentMatch) {
        fastify.log.info(`[tournament-match] No tournament match found for game ${gameId}`);
        return reply.code(404).send({ error: "Tournament match not found for this game" });
      }

      fastify.log.info(
        `[tournament-match] Found tournament match for game ${gameId}: ${JSON.stringify(tournamentMatch)}`
      );
      return reply.send({ tournamentMatch });
    } catch (err) {
      fastify.log.error(`[tournament-match] Error retrieving match for game ${gameId}:`, err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/public/match/:gameId", async (request, reply) => {
    const { gameId } = request.params;
    fastify.log.info(`[tournament-match] Public request for match info for game ${gameId}`);

    try {
      const tournamentMatch = await new Promise((resolve, reject) => {
        db.get(
          `SELECT tm.tournament_id, tm.round, tm.match_order, t.name as tournament_name, g.status
           FROM tournament_matches tm
           JOIN tournaments t ON tm.tournament_id = t.id
           JOIN games g ON tm.game_id = g.id
           WHERE tm.game_id = ?`,
          [gameId],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (!tournamentMatch) {
        fastify.log.info(`[tournament-match] No tournament match found for game ${gameId} (public API)`);
        return reply.code(404).send({ error: "Tournament match not found for this game" });
      }

      fastify.log.info(
        `[tournament-match] Found tournament match for game ${gameId} (public API): ${JSON.stringify(tournamentMatch)}`
      );
      return reply.send({ tournamentMatch });
    } catch (err) {
      fastify.log.error(`[tournament-match] Error retrieving match for game ${gameId} (public API):`, err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/advance/:tournamentId", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { tournamentId } = request.params;
    const { currentRound } = request.body;

    if (!currentRound) {
      return reply.code(400).send({ error: "Current round is required" });
    }

    try {
      const completedMatches = await new Promise((resolve, reject) => {
        db.all(
          `SELECT tm.*, g.player1_id, g.player2_id, g.player1_score, g.player2_score, g.status
           FROM tournament_matches tm
           JOIN games g ON tm.game_id = g.id
           WHERE tm.tournament_id = ? AND tm.round = ? AND g.status = 'completed'`,
          [tournamentId, currentRound],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          }
        );
      });

      const allMatches = await new Promise((resolve, reject) => {
        db.all(
          `SELECT COUNT(*) as total
           FROM tournament_matches
           WHERE tournament_id = ? AND round = ?`,
          [tournamentId, currentRound],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows[0].total);
          }
        );
      });

      if (completedMatches.length < allMatches) {
        return reply.code(400).send({
          error: "Not all matches in this round are completed",
          completed: completedMatches.length,
          total: allMatches,
        });
      }

      const winners = completedMatches.map((match) => {
        const winner = match.player1_score > match.player2_score ? match.player1_id : match.player2_id;
        return {
          playerId: winner,
          matchOrder: match.match_order,
        };
      });

      const nextRound = currentRound + 1;
      const newMatches = [];

      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          const player1Id = winners[i].playerId;
          const player2Id = winners[i + 1].playerId;
          const matchOrder = Math.floor(i / 2) + 1;

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

          await new Promise((resolve, reject) => {
            db.run(
              "INSERT INTO tournament_matches (tournament_id, game_id, round, match_order) VALUES (?, ?, ?, ?)",
              [tournamentId, gameId, nextRound, matchOrder],
              function (err) {
                if (err) reject(err);
                resolve(this.lastID);
              }
            );
          });

          const matchInfo = await new Promise((resolve, reject) => {
            db.get(
              `SELECT tm.*, g.player1_id, g.player2_id, g.status,
                      u1.username as player1_name, u2.username as player2_name
               FROM tournament_matches tm
               JOIN games g ON tm.game_id = g.id
               JOIN users u1 ON g.player1_id = u1.id
               JOIN users u2 ON g.player2_id = u2.id
               WHERE tm.tournament_id = ? AND tm.round = ? AND tm.match_order = ?`,
              [tournamentId, nextRound, matchOrder],
              (err, row) => {
                if (err) reject(err);
                resolve(row);
              }
            );
          });

          newMatches.push(matchInfo);
        }
      }

      if (winners.length === 1) {
        await new Promise((resolve, reject) => {
          db.run(
            "UPDATE tournaments SET status = ?, winner_id = ? WHERE id = ?",
            ["completed", winners[0].playerId, tournamentId],
            function (err) {
              if (err) reject(err);
              resolve();
            }
          );
        });
      }

      const tournament = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM tournaments WHERE id = ?", [tournamentId], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      fastify.io.to(`tournament:${tournamentId}`).emit("tournament:updated", tournament);

      return reply.send({
        message: "Next round created successfully",
        matches: newMatches,
        tournament,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}

module.exports = routes;
