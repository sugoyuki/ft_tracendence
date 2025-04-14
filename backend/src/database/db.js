"use strict";

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "transcendence.db");
const db = new sqlite3.Database(dbPath);

const initialize = () => {
  return new Promise((resolve, reject) => {
    console.log(`Initializing database at ${dbPath}`);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        status TEXT DEFAULT 'offline',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        player1_score INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player1_id) REFERENCES users(id),
        FOREIGN KEY (player2_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_by INTEGER,
        description TEXT,
        max_players INTEGER DEFAULT 4,
        start_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(tournament_id, user_id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tournament_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        round INTEGER NOT NULL,
        match_order INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        room TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    db.run(
      `
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, accepted
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (friend_id) REFERENCES users(id),
        UNIQUE(user_id, friend_id)
      )
    `,
      (err) => {
        if (err) {
          console.error("Error initializing database:", err);
          reject(err);
        } else {
          console.log("Database initialized successfully");
          resolve();
        }
      }
    );
  });
};

module.exports = {
  db,
  initialize,
};
