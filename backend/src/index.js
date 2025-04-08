"use strict";

require("dotenv").config();
const path = require("path");
const fastify = require("fastify")({
  logger: true,
  // Temporarily disable HTTPS until proper certificates are configured
  // https: {
  //   key: process.env.SSL_KEY_PATH ? require("fs").readFileSync(process.env.SSL_KEY_PATH) : undefined,
  //   cert: process.env.SSL_CERT_PATH ? require("fs").readFileSync(process.env.SSL_CERT_PATH) : undefined,
  // },
});

const db = require("./database/db");

fastify.register(require("@fastify/cors"), {
  origin: '*', // Allow any origin for development, restrict this in production
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Content-Disposition']
});

fastify.register(require("@fastify/jwt"), {
  secret: process.env.JWT_SECRET || "your-secret-key-replace-in-production",
});

fastify.register(require("fastify-socket.io"), {
  cors: {
    origin: '*', // Allow any origin for development
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
});

fastify.register(require("./middleware/auth"));

fastify.register(require("./routes/user"), { prefix: "/api/users" });
fastify.register(require("./routes/auth"), { prefix: "/api/auth" });
fastify.register(require("./routes/game"), { prefix: "/api/games" });
fastify.register(require("./routes/tournament"), { prefix: "/api/tournaments" });

fastify.ready((err) => {
  if (err) throw err;

  require("./socket/gameSocket")(fastify.io);
  require("./socket/chatSocket")(fastify.io);

  fastify.log.info("Socket.io server initialized");
});

const start = async () => {
  try {
    await db.initialize();
    await fastify.listen({ port: process.env.PORT || 8000, host: "0.0.0.0" });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
