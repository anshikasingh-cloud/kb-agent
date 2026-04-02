# KB Agent — Zoho CRM Internal Knowledge Base Assistant

A RAG-powered chat widget embedded in Zoho CRM, backed by OpenAI Assistants API and a Vector Store.

---

## Quick Start

### Prerequisites
- Node.js >= 18
- An OpenAI account with API access
- A publicly accessible server/URL for the backend (Railway, Render, VPS, etc.)

### 1. Install dependencies
```bash
cd kb-agent
npm install
```

### 2. Configure environment
```bash
cp server/.env.example server/.env
# Edit server/.env and add your OPENAI_API_KEY
```

### 3. Create the OpenAI Assistant and Vector Store (one-time)
```bash
node scripts/setup-openai.js
```
Copy the printed `ASSISTANT_ID` and `VECTOR_STORE_ID` into `server/.env`.

### 4. Upload your KB documents
Place your documents (`.pdf`, `.docx`, `.txt`, `.md`) in the `docs/` folder, then:
```bash
node scripts/upload-docs.js ./docs/
```
Re-run this command any time you add or update documents.

### 5. Start the backend
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 6. Deploy the Zoho CRM widget
1. Open `zoho-widget/client-script.js`
2. Replace `https://YOUR_BACKEND_URL/api/chat` with your deployed backend URL
3. In Zoho CRM, go to **Setup → Developer Space → Client Script**
4. Click **New Script**, set **All Pages** as the scope, paste the file contents, and save

---

## File Structure

```
kb-agent/
├── server/
│   ├── index.js            # Express app entry point
│   ├── routes/chat.js      # POST /api/chat handler
│   ├── db/threads.js       # SQLite userId → threadId store
│   └── .env                # Environment variables (not committed)
├── scripts/
│   ├── setup-openai.js     # One-time: create assistant + vector store
│   └── upload-docs.js      # Ongoing: upload KB documents
├── zoho-widget/
│   └── client-script.js    # Paste into Zoho CRM Client Script
├── docs/                   # Put your KB documents here
└── package.json
```

---

## Environment Variables

| Variable          | Description                                      |
|-------------------|--------------------------------------------------|
| `OPENAI_API_KEY`  | Your OpenAI API key                              |
| `ASSISTANT_ID`    | ID of the assistant created by setup script      |
| `VECTOR_STORE_ID` | ID of the vector store created by setup script   |
| `ALLOWED_ORIGIN`  | CORS origin — default `https://crm.zoho.com`     |
| `PORT`            | Server port — default `3000`                     |

---

## How It Works

1. **Widget** — A floating chat button injected on every Zoho CRM page via Client Script
2. **User identity** — The widget reads the logged-in Zoho user's email via `ZOHO.CRM.CONFIG.get("CurrentUser")`
3. **Backend** — Express API receives `{ userId, message }`, looks up or creates an OpenAI thread for the user, runs the assistant, and returns the reply
4. **Persistence** — Each user's `threadId` is stored in SQLite so conversation history persists across CRM sessions
5. **RAG** — The OpenAI Assistant uses `file_search` to retrieve relevant chunks from the Vector Store before generating a response

---

## Updating the Knowledge Base

Simply add new documents to `docs/` and run:
```bash
node scripts/upload-docs.js ./docs/
```
Changes are reflected immediately — no backend restart needed.
