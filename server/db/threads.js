/**
 * SQLite-backed thread store.
 * Maps Zoho user IDs to OpenAI Thread IDs so conversations persist across sessions.
 */

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../threads.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_threads (
        user_id   TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return db;
}

/**
 * Returns the OpenAI thread ID for a given user, or null if not found.
 * @param {string} userId
 * @returns {string|null}
 */
function getThreadId(userId) {
  const row = getDb().prepare("SELECT thread_id FROM user_threads WHERE user_id = ?").get(userId);
  return row ? row.thread_id : null;
}

/**
 * Saves a userId → threadId mapping.
 * @param {string} userId
 * @param {string} threadId
 */
function saveThreadId(userId, threadId) {
  getDb()
    .prepare("INSERT OR REPLACE INTO user_threads (user_id, thread_id) VALUES (?, ?)")
    .run(userId, threadId);
}

module.exports = { getThreadId, saveThreadId };
