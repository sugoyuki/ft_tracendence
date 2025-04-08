"use strict";

const bcrypt = require("bcrypt");
const { db } = require("../database/db");

async function routes(fastify, options) {
  fastify.post("/register", async (request, reply) => {
    const { username, email, password } = request.body;

    if (!username || !email || !password) {
      return reply.code(400).send({ error: "Username, email and password are required" });
    }

    try {
      console.log("Registration attempt:", { username, email });

      const userExists = await new Promise((resolve, reject) => {
        db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email], (err, row) => {
          if (err) {
            console.error("Database error checking user existence:", err);
            reject(err);
          }
          console.log("User exists check result:", row);
          resolve(row);
        });
      });

      if (userExists) {
        return reply.code(409).send({ error: "Username or email already in use" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
          [username, email, hashedPassword],
          function (err) {
            if (err) reject(err);
            resolve(this.lastID);
          }
        );
      });

      return reply.code(201).send({ message: "User registered successfully" });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ error: "Email and password are required" });
    }

    try {
      const user = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!user) {
        return reply.code(401).send({ error: "Invalid email or password" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return reply.code(401).send({ error: "Invalid email or password" });
      }

      db.run("UPDATE users SET status = ? WHERE id = ?", ["online", user.id]);

      const token = fastify.jwt.sign({ id: user.id, username: user.username, email: user.email }, { expiresIn: "24h" });

      return reply.send({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/logout", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      db.run("UPDATE users SET status = ? WHERE id = ?", ["offline", request.user.id]);
      return reply.send({ message: "Logged out successfully" });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/me", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await new Promise((resolve, reject) => {
        db.get("SELECT id, username, email, avatar, status FROM users WHERE id = ?", [request.user.id], (err, row) => {
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
}

module.exports = routes;
