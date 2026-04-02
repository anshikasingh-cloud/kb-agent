/**
 * Document upload script — run whenever KB content needs to be added or updated.
 * Usage: node scripts/upload-docs.js ./docs/
 *        node scripts/upload-docs.js ./docs/my-specific-file.pdf
 *
 * Supports: .pdf, .docx, .txt, .md
 */

require("dotenv").config({ path: `${__dirname}/../server/.env` });
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

function collectFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    return [target];
  }
  // Directory: collect all supported files recursively
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const s = fs.statSync(full);
      if (s.isDirectory()) {
        walk(full);
      } else if (SUPPORTED_EXTENSIONS.includes(path.extname(full).toLowerCase())) {
        results.push(full);
      }
    }
  }
  walk(target);
  return results;
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node scripts/upload-docs.js <file-or-directory>");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY is not set in server/.env");
    process.exit(1);
  }
  if (!process.env.VECTOR_STORE_ID) {
    console.error("ERROR: VECTOR_STORE_ID is not set in server/.env — run setup-openai.js first");
    process.exit(1);
  }

  const files = collectFiles(path.resolve(target));
  if (files.length === 0) {
    console.error(`No supported files found in: ${target}`);
    console.error(`Supported types: ${SUPPORTED_EXTENSIONS.join(", ")}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} file(s) to upload:`);
  files.forEach((f) => console.log(`  ${f}`));

  const fileStreams = files.map((f) => fs.createReadStream(f));

  console.log("\nUploading to OpenAI Vector Store...");
  const batch = await openai.beta.vectorStores.fileBatches.uploadAndPoll(
    process.env.VECTOR_STORE_ID,
    { files: fileStreams }
  );

  console.log(`\nUpload complete!`);
  console.log(`  Status       : ${batch.status}`);
  console.log(`  Files added  : ${batch.file_counts.completed}`);
  if (batch.file_counts.failed > 0) {
    console.warn(`  Files failed : ${batch.file_counts.failed} (check OpenAI dashboard for details)`);
  }
}

main().catch((err) => {
  console.error("Upload failed:", err.message);
  process.exit(1);
});
