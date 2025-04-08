"use strict";

const { db } = require("../database/db");

async function routes(fastify, options) {
  fastify.get("/", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const users = await new Promise((resolve, reject) => {
        db.all("SELECT id, username, email, avatar, status FROM users", (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });
      return reply.send({ users });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/:id", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    try {
      const user = await new Promise((resolve, reject) => {
        db.get("SELECT id, username, email, avatar, status FROM users WHERE id = ?", [id], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      return reply.send({ user });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.put("/:id", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { username, avatar } = request.body;

    if (parseInt(id) !== request.user.id) {
      return reply.code(403).send({ error: "You can only update your own profile" });
    }

    try {
      if (username) {
        const usernameExists = await new Promise((resolve, reject) => {
          db.get("SELECT id FROM users WHERE username = ? AND id != ?", [username, id], (err, row) => {
            if (err) reject(err);
            resolve(row);
          });
        });

        if (usernameExists) {
          return reply.code(409).send({ error: "Username already in use" });
        }
      }

      const updateFields = [];
      const values = [];

      if (username) {
        updateFields.push("username = ?");
        values.push(username);
      }

      if (avatar) {
        updateFields.push("avatar = ?");
        values.push(avatar);
      }

      if (updateFields.length === 0) {
        return reply.code(400).send({ error: "No fields to update" });
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      await new Promise((resolve, reject) => {
        db.run(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, values, function (err) {
          if (err) reject(err);
          resolve(this.changes);
        });
      });

      const updatedUser = await new Promise((resolve, reject) => {
        db.get("SELECT id, username, email, avatar, status FROM users WHERE id = ?", [id], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      return reply.send({ user: updatedUser });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/:id/games", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
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
          WHERE g.player1_id = ? OR g.player2_id = ?
          ORDER BY g.created_at DESC
        `,
          [id, id],
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
