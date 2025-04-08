"use strict";

const { db } = require("../database/db");

module.exports = function (io) {
  const connectedUsers = new Map();

  io.on("connection", (socket) => {
    if (socket.handshake.auth && socket.handshake.auth.userId) {
      const userId = socket.handshake.auth.userId;
      connectedUsers.set(socket.id, {
        userId: userId,
        socketId: socket.id,
      });

      socket.join(`user:${userId}`);
    }

    socket.on("chat:join_room", (data) => {
      const { roomId } = data;

      if (!roomId) {
        return socket.emit("error", { message: "Room ID is required" });
      }

      socket.join(`chat:${roomId}`);
      console.log(`User joined chat room: ${roomId}`);

      loadRecentMessages(roomId)
        .then((messages) => {
          socket.emit("chat:history", { roomId, messages });
        })
        .catch((error) => {
          console.error("Error loading chat history:", error);
          socket.emit("error", { message: "Failed to load chat history" });
        });
    });

    socket.on("chat:message", async (data) => {
      const { roomId, content } = data;
      const userData = connectedUsers.get(socket.id);

      if (!userData || !userData.userId) {
        return socket.emit("error", { message: "Not authenticated" });
      }

      if (!roomId || !content) {
        return socket.emit("error", { message: "Room ID and content are required" });
      }

      try {
        const messageId = await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO chat_messages (user_id, content, room) VALUES (?, ?, ?)",
            [userData.userId, content, roomId],
            function (err) {
              if (err) reject(err);
              resolve(this.lastID);
            }
          );
        });

        const user = await new Promise((resolve, reject) => {
          db.get("SELECT id, username, avatar FROM users WHERE id = ?", [userData.userId], (err, row) => {
            if (err) reject(err);
            resolve(row);
          });
        });

        const message = {
          id: messageId,
          content,
          roomId,
          userId: userData.userId,
          username: user.username,
          avatar: user.avatar,
          timestamp: new Date().toISOString(),
        };

        io.to(`chat:${roomId}`).emit("chat:message", message);
      } catch (error) {
        console.error("Error sending chat message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("chat:typing", (data) => {
      const { roomId, isTyping } = data;
      const userData = connectedUsers.get(socket.id);

      if (!userData || !roomId) {
        return;
      }

      socket.to(`chat:${roomId}`).emit("chat:typing", {
        userId: userData.userId,
        isTyping,
      });
    });

    socket.on("disconnect", () => {
      const userData = connectedUsers.get(socket.id);
      if (userData) {
        connectedUsers.delete(socket.id);
      }
    });
  });

  async function loadRecentMessages(roomId, limit = 50) {
    try {
      return await new Promise((resolve, reject) => {
        db.all(
          `
          SELECT cm.*, u.username, u.avatar
          FROM chat_messages cm
          JOIN users u ON cm.user_id = u.id
          WHERE cm.room = ?
          ORDER BY cm.created_at DESC
          LIMIT ?
        `,
          [roomId, limit],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.reverse());
          }
        );
      });
    } catch (error) {
      console.error("Error loading messages:", error);
      return [];
    }
  }
};
