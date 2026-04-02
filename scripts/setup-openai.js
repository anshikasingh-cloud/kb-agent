/**
 * One-time setup script.
 * Run: node scripts/setup-openai.js
 *
 * Creates:
 *   1. An OpenAI Vector Store
 *   2. An OpenAI Assistant with file_search enabled and the vector store attached
 *
 * Outputs the ASSISTANT_ID and VECTOR_STORE_ID to copy into your .env file.
 */

require("dotenv").config({ path: `${__dirname}/../server/.env` });
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ASSISTANT_NAME = "Internal KB Assistant";
const ASSISTANT_INSTRUCTIONS = `You are a helpful internal knowledge base assistant for our organisation.
Your role is to answer questions about internal operations, processes, and CRM setup based strictly on the documents provided to you.
- Always base your answers on the provided knowledge base documents.
- If the answer is not found in the documents, say so clearly — do not guess or make up information.
- Be concise and professional.
- When relevant, mention which document or section your answer comes from.`;

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY is not set in server/.env");
    process.exit(1);
  }

  console.log("Creating Vector Store...");
  const vectorStore = await openai.beta.vectorStores.create({
    name: "Internal KB Vector Store",
  });
  console.log(`  Vector Store created: ${vectorStore.id}`);

  console.log("Creating Assistant...");
  const assistant = await openai.beta.assistants.create({
    name: ASSISTANT_NAME,
    instructions: ASSISTANT_INSTRUCTIONS,
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStore.id],
      },
    },
  });
  console.log(`  Assistant created: ${assistant.id}`);

  console.log("\n=== Add these to your server/.env file ===");
  console.log(`ASSISTANT_ID=${assistant.id}`);
  console.log(`VECTOR_STORE_ID=${vectorStore.id}`);
  console.log("==========================================\n");
  console.log("Next: run `node scripts/upload-docs.js ./docs/` to upload your KB documents.");
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
