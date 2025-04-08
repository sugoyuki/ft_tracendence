"use strict";

const fp = require("fastify-plugin");

module.exports = fp(async function (fastify, opts) {
  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "Unauthorized access" });
    }
  });

  fastify.decorate("authenticateSocket", (socket, next) => {
    if (!socket.handshake.auth || !socket.handshake.auth.token) {
      return next(new Error("Authentication error: Token missing"));
    }

    try {
      const decoded = fastify.jwt.verify(socket.handshake.auth.token);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });
});
