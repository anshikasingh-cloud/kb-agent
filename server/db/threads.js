/**
 * JSON file-backed thread store.
 * Maps Zoho user IDs to OpenAI Thread IDs so conversations persist across sessions.
 * Uses Node.js built-in `fs` — no native dependencies required.
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../threads.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Returns the OpenAI thread ID for a given user, or null if not found.
 * @param {string} userId
 * @returns {string|null}
 */
function getThreadId(userId) {
  return load()[userId] || null;
}

/**
 * Saves a userId → threadId mapping.
 * @param {string} userId
 * @param {string} threadId
 */
function saveThreadId(userId, threadId) {
  const data = load();
  data[userId] = threadId;
  save(data);
}

module.exports = { getThreadId, saveThreadId };
