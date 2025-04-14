"use strict";

const { db } = require("../database/db");

async function routes(fastify, options) {
  fastify.post("/", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { name, description, maxPlayers, startDate } = request.body;

    if (!name) {
      return reply.code(400).send({ error: "Tournament name is required" });
    }

    try {
      const tournamentId = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO tournaments (name, status, created_by, description, max_players, start_date) VALUES (?, ?, ?, ?, ?, ?)", 
          [name, "pending", request.user.id, description, maxPlayers || 4, startDate], 
          function (err) {
            if (err) reject(err);
            resolve(this.lastID);
          }
        );
      });

      await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)",
          [tournamentId, request.user.id],
          function (err) {
            if (err) reject(err);
            resolve(this.lastID);
          }
        );
      });

      const tournament = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM tournaments WHERE id = ?", [tournamentId], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      fastify.io.emit("tournament:created", { tournament });

      return reply.code(201).send({ tournament });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      // 作成者情報も含めて取得するようにクエリを修正
      const tournaments = await new Promise((resolve, reject) => {
        db.all(
          `SELECT t.*, u.username as creator_name, u.id as creator_id,
                  (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as current_players
           FROM tournaments t
           LEFT JOIN users u ON t.created_by = u.id
           ORDER BY t.created_at DESC`,
          (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          }
        );
      });

      // 各トーナメントの参加者情報を取得
      for (const tournament of tournaments) {
        tournament.participants = await new Promise((resolve, reject) => {
          db.all(
            `SELECT tp.*, u.username 
             FROM tournament_participants tp
             JOIN users u ON tp.user_id = u.id
             WHERE tp.tournament_id = ?`,
            [tournament.id],
            (err, participants) => {
              if (err) reject(err);
              resolve(participants || []);
            }
          );
        });
      }

      return reply.send({ tournaments });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/:id", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;

    try {
      const tournament = await new Promise((resolve, reject) => {
        db.get(
          `SELECT t.*, u.username as creator_name
           FROM tournaments t
           LEFT JOIN users u ON t.created_by = u.id
           WHERE t.id = ?`, 
          [id], 
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (!tournament) {
        return reply.code(404).send({ error: "Tournament not found" });
      }

      const participants = await new Promise((resolve, reject) => {
        db.all(
          `
          SELECT tp.*, u.username, u.avatar
          FROM tournament_participants tp
          JOIN users u ON tp.user_id = u.id
          WHERE tp.tournament_id = ?
        `,
          [id],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          }
        );
      });

      const matches = await new Promise((resolve, reject) => {
        db.all(
          `
          SELECT tm.*, g.player1_id, g.player2_id, g.player1_score, g.player2_score, g.status,
            u1.username as player1_name, u2.username as player2_name
          FROM tournament_matches tm
          JOIN games g ON tm.game_id = g.id
          JOIN users u1 ON g.player1_id = u1.id
          JOIN users u2 ON g.player2_id = u2.id
          WHERE tm.tournament_id = ?
          ORDER BY tm.round, tm.match_order
        `,
          [id],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          }
        );
      });

      return reply.send({
        tournament,
        participants,
        matches,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/:id/join", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;

    try {
      const tournament = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM tournaments WHERE id = ?", [id], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!tournament) {
        return reply.code(404).send({ error: "Tournament not found" });
      }

      if (tournament.status !== "pending") {
        return reply.code(400).send({ error: "Tournament is not open for registration" });
      }

      const existingParticipant = await new Promise((resolve, reject) => {
        db.get(
          "SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?",
          [id, request.user.id],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (existingParticipant) {
        return reply.code(400).send({ error: "You are already in this tournament" });
      }

      await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)",
          [id, request.user.id],
          function (err) {
            if (err) reject(err);
            resolve(this.lastID);
          }
        );
      });

      const participant = await new Promise((resolve, reject) => {
        db.get(
          `
          SELECT tp.*, u.username, u.avatar
          FROM tournament_participants tp
          JOIN users u ON tp.user_id = u.id
          WHERE tp.tournament_id = ? AND tp.user_id = ?
        `,
          [id, request.user.id],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      fastify.io.to(`tournament:${id}`).emit("tournament:participant_joined", {
        tournamentId: id,
        participant,
      });

      return reply.code(200).send({ message: "Joined tournament successfully", participant });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/:id/start", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;

    try {
      const tournament = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM tournaments WHERE id = ?", [id], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!tournament) {
        return reply.code(404).send({ error: "Tournament not found" });
      }

      if (tournament.status !== "pending") {
        return reply.code(400).send({ error: "Tournament cannot be started" });
      }

      const participants = await new Promise((resolve, reject) => {
        db.all(
          `
          SELECT tp.*, u.username
          FROM tournament_participants tp
          JOIN users u ON tp.user_id = u.id
          WHERE tp.tournament_id = ?
        `,
          [id],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          }
        );
      });

      if (participants.length < 2) {
        return reply.code(400).send({ error: "Tournament needs at least 2 participants to start" });
      }

      const matches = createTournamentMatches(participants);

      await new Promise((resolve, reject) => {
        db.run("BEGIN TRANSACTION", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      try {
        await new Promise((resolve, reject) => {
          db.run(
            "UPDATE tournaments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            ["active", id],
            function (err) {
              if (err) reject(err);
              resolve();
            }
          );
        });

        for (const matchup of matches) {
          const gameId = await new Promise((resolve, reject) => {
            db.run(
              "INSERT INTO games (player1_id, player2_id, status) VALUES (?, ?, ?)",
              [matchup.player1Id, matchup.player2Id, "pending"],
              function (err) {
                if (err) reject(err);
                resolve(this.lastID);
              }
            );
          });

          await new Promise((resolve, reject) => {
            db.run(
              "INSERT INTO tournament_matches (tournament_id, game_id, round, match_order) VALUES (?, ?, ?, ?)",
              [id, gameId, matchup.round, matchup.order],
              function (err) {
                if (err) reject(err);
                resolve();
              }
            );
          });
        }

        await new Promise((resolve, reject) => {
          db.run("COMMIT", (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (err) {
        await new Promise((resolve, reject) => {
          db.run("ROLLBACK", (err) => {
            resolve();
          });
        });
        throw err;
      }

      const updatedTournament = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM tournaments WHERE id = ?", [id], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      const tournamentMatches = await new Promise((resolve, reject) => {
        db.all(
          `
          SELECT tm.*, g.player1_id, g.player2_id, g.status,
            u1.username as player1_name, u2.username as player2_name
          FROM tournament_matches tm
          JOIN games g ON tm.game_id = g.id
          JOIN users u1 ON g.player1_id = u1.id
          JOIN users u2 ON g.player2_id = u2.id
          WHERE tm.tournament_id = ?
          ORDER BY tm.round, tm.match_order
        `,
          [id],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          }
        );
      });

      fastify.io.to(`tournament:${id}`).emit("tournament:started", {
        tournament: updatedTournament,
        matches: tournamentMatches,
      });

      return reply.send({
        message: "Tournament started successfully",
        tournament: updatedTournament,
        matches: tournamentMatches,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}

function createTournamentMatches(participants) {
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);

  const matches = [];
  for (let i = 0; i < shuffledParticipants.length; i += 2) {
    if (i + 1 < shuffledParticipants.length) {
      matches.push({
        player1Id: shuffledParticipants[i].user_id,
        player2Id: shuffledParticipants[i + 1].user_id,
        round: 1,
        order: Math.floor(i / 2) + 1,
      });
    } else {
      matches.push({
        player1Id: shuffledParticipants[i].user_id,
        player2Id: null,
        round: 1,
        order: Math.floor(i / 2) + 1,
      });
    }
  }

  return matches;
}

module.exports = routes;
