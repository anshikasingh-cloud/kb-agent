/**
 * POST /api/chat
 * Body: { userId: string, message: string }
 * Returns: { reply: string }
 */

const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { getThreadId, saveThreadId } = require("../db/threads");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return res.status(400).json({ error: "userId is required" });
  }
  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "message is required" });
  }

  const sanitizedUserId = userId.trim();
  const sanitizedMessage = message.trim();

  try {
    // 1. Get or create a thread for this user
    let threadId = getThreadId(sanitizedUserId);
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      saveThreadId(sanitizedUserId, threadId);
    }

    // 2. Add the user's message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: sanitizedMessage,
    });

    // 3. Run the assistant and wait for completion
    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    if (run.status !== "completed") {
      console.error(`Run ended with status: ${run.status}`, run.last_error);
      return res.status(502).json({ error: `Assistant run failed with status: ${run.status}` });
    }

    // 4. Fetch the latest assistant message
    const messages = await openai.beta.threads.messages.list(threadId, {
      order: "desc",
      limit: 1,
    });

    const latest = messages.data[0];
    if (!latest || latest.role !== "assistant") {
      return res.status(502).json({ error: "No assistant response received" });
    }

    // Extract text content (handle annotations if present)
    const reply = latest.content
      .filter((block) => block.type === "text")
      .map((block) => block.text.value)
      .join("\n");

    return res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
