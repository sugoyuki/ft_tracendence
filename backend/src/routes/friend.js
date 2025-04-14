"use strict";

const { db } = require("../database/db");

async function routes(fastify, options) {
  fastify.post("/request/:friendId", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const friendId = parseInt(request.params.friendId);
    const userId = parseInt(request.user.id);

    fastify.log.info(`Friend request initiated from user ${userId} to ${friendId}`);

    if (friendId === userId) {
      return reply.code(400).send({ error: "You cannot add yourself as a friend" });
    }

    try {
      const friendExists = await new Promise((resolve, reject) => {
        db.get("SELECT id FROM users WHERE id = ?", [friendId], (err, row) => {
          if (err) {
            fastify.log.error(`Error checking if friend exists: ${err.message}`);
            reject(err);
          }
          resolve(row);
        });
      });

      if (!friendExists) {
        fastify.log.info(`Friend with ID ${friendId} not found`);
        return reply.code(404).send({ error: "User not found" });
      }

      const existingFriendship = await new Promise((resolve, reject) => {
        fastify.log.info(`Checking existing friendship between ${userId} and ${friendId}`);
        db.get(
          "SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
          [userId, friendId, friendId, userId],
          (err, row) => {
            if (err) {
              fastify.log.error(`Error checking friendship: ${err.message}`);
              reject(err);
            }
            if (row) {
              fastify.log.info(`Found existing friendship: ${JSON.stringify(row)}`);
            }
            resolve(row);
          }
        );
      });

      if (existingFriendship) {
        if (existingFriendship.status === "accepted") {
          return reply.code(400).send({ error: "You are already friends with this user" });
        } else if (existingFriendship.status === "pending" && existingFriendship.user_id === userId) {
          return reply.code(400).send({ error: "Friend request already sent" });
        } else if (existingFriendship.status === "pending" && existingFriendship.friend_id === userId) {
          await new Promise((resolve, reject) => {
            db.run(
              "UPDATE friendships SET status = 'accepted' WHERE user_id = ? AND friend_id = ?",
              [friendId, userId],
              function (err) {
                if (err) reject(err);
                resolve(this.changes);
              }
            );
          });
          return reply.send({ message: "Friend request accepted" });
        }
      }

      const friendshipId = await new Promise((resolve, reject) => {
        fastify.log.info(`Creating new friend request from ${userId} to ${friendId}`);
        db.run(
          "INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')",
          [userId, friendId],
          function (err) {
            if (err) {
              fastify.log.error(`Error creating friendship: ${err.message}`);
              reject(err);
            }
            fastify.log.info(`Friend request created with ID: ${this.lastID}`);
            resolve(this.lastID);
          }
        );
      });

      fastify.io.to(`user:${friendId}`).emit("friend:request", {
        from: { id: userId, username: request.user.username },
      });

      return reply.send({ message: "Friend request sent" });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.put("/accept/:requestId", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { requestId } = request.params;
    const userId = request.user.id;

    try {
      const friendRequest = await new Promise((resolve, reject) => {
        db.get(
          "SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = 'pending'",
          [requestId, userId],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (!friendRequest) {
        return reply.code(404).send({ error: "Friend request not found or already processed" });
      }

      await new Promise((resolve, reject) => {
        db.run("UPDATE friendships SET status = 'accepted' WHERE id = ?", [requestId], function (err) {
          if (err) reject(err);
          resolve(this.changes);
        });
      });

      fastify.io.to(`user:${friendRequest.user_id}`).emit("friend:accepted", {
        by: { id: userId, username: request.user.username },
      });

      return reply.send({ message: "Friend request accepted" });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.put("/reject/:requestId", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { requestId } = request.params;
    const userId = request.user.id;

    try {
      const friendRequest = await new Promise((resolve, reject) => {
        db.get(
          "SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = 'pending'",
          [requestId, userId],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (!friendRequest) {
        return reply.code(404).send({ error: "Friend request not found or already processed" });
      }

      await new Promise((resolve, reject) => {
        db.run("DELETE FROM friendships WHERE id = ?", [requestId], function (err) {
          if (err) reject(err);
          resolve(this.changes);
        });
      });

      return reply.send({ message: "Friend request rejected" });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.delete("/:friendId", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { friendId } = request.params;
    const userId = request.user.id;

    try {
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
          [userId, friendId, friendId, userId],
          function (err) {
            if (err) reject(err);
            resolve(this.changes);
          }
        );
      });

      return reply.send({ message: "Friend removed" });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    try {
      const friends = await new Promise((resolve, reject) => {
        db.all(
          `
          SELECT
            u.id, u.username, u.avatar, u.status,
            f.status as friendship_status,
            f.id as friendship_id,
            CASE
              WHEN f.user_id = ? THEN 'sent'
              WHEN f.friend_id = ? THEN 'received'
            END as request_direction
          FROM friendships f
          JOIN users u ON (f.user_id = u.id AND f.friend_id = ?) OR (f.friend_id = u.id AND f.user_id = ?)
          ORDER BY f.created_at DESC
          `,
          [userId, userId, userId, userId],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          }
        );
      });

      const acceptedFriends = [];
      const pendingRequests = {
        sent: [],
        received: [],
      };

      friends.forEach((friend) => {
        if (friend.friendship_status === "accepted") {
          acceptedFriends.push({
            id: friend.id,
            username: friend.username,
            avatar: friend.avatar,
            status: friend.status,
            friendship_id: friend.friendship_id,
          });
        } else if (friend.friendship_status === "pending") {
          const friendData = {
            id: friend.id,
            username: friend.username,
            avatar: friend.avatar,
            friendship_id: friend.friendship_id,
          };

          if (friend.request_direction === "sent") {
            pendingRequests.sent.push(friendData);
          } else {
            pendingRequests.received.push(friendData);
          }
        }
      });

      return reply.send({
        friends: acceptedFriends,
        pendingRequests,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/status/:userId", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.params;

    try {
      const userStatus = await new Promise((resolve, reject) => {
        db.get("SELECT status FROM users WHERE id = ?", [userId], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!userStatus) {
        return reply.code(404).send({ error: "User not found" });
      }

      return reply.send({ status: userStatus.status });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}

module.exports = routes;
