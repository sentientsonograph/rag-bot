# RAG Bot — PDF Document Intelligence

A full-stack Retrieval-Augmented Generation (RAG) app. Upload PDFs, select them, and chat with your documents using Google Gemini.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  React · DM Sans · Syne · Lucide Icons · react-markdown    │
│  ┌──────────────────┐  ┌──────────────────────────────────┐│
│  │  Document Panel  │  │         Chat Panel               ││
│  │  Upload / Select │  │  SSE streaming · Markdown render ││
│  └──────────────────┘  └──────────────────────────────────┘│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / SSE (localhost:3000→8000)
┌──────────────────────────────▼──────────────────────────────┐
│                         BACKEND                             │
│                FastAPI · Python 3.11+                       │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ PDF Parse │  │  Chunker     │  │  Vector Store        │ │
│  │ pdfplumber│→ │  800 chars   │→ │  NumPy (in-memory)   │ │
│  └───────────┘  │  150 overlap │  └──────────────────────┘ │
│                 └──────────────┘                            │
│                        │                                    │
│            ┌───────────▼──────────────┐                    │
│            │   Google Gemini APIs     │                    │
│            │  text-embedding-004      │                    │
│            │  gemini-2.0-flash        │                    │
│            └──────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Min Version | Check |
|------|-------------|-------|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Google API Key | — | [Get one →](https://aistudio.google.com/app/apikey) |

---

## Setup — Step by Step

### 1. Clone / extract the project

```bash
# If from git:
git clone <your-repo-url>
cd rag-bot

# Or just cd into the extracted folder:
cd rag-bot
```

### 2. Get a Google API Key

1. Go to **https://aistudio.google.com/app/apikey**
2. Click **Create API key**
3. Copy the key — you'll need it in the next step

### 3. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# On macOS / Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Open `.env` and set your key:
```
GOOGLE_API_KEY=AIza...your_key_here...
```

Start the backend server:
```bash
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Test it: http://localhost:8000/health → should return `{"status":"ok"}`

### 4. Frontend setup

Open a **new terminal**:

```bash
cd frontend

# Install Node dependencies
npm install

# Start the dev server
npm start
```

The browser opens automatically at **http://localhost:3000**

---

## Usage

1. **Upload PDFs** — drag and drop or click "Drop PDFs or click to upload" in the sidebar
2. **Select documents** — click a document to toggle it (purple highlight = selected)
3. **Ask questions** — type in the chat box and press Enter
4. The bot retrieves the most relevant chunks and streams an answer with source citations

---

## Project Structure

```
rag-bot/
├── backend/
│   ├── main.py              # FastAPI app — upload, embed, retrieve, stream
│   ├── requirements.txt
│   ├── .env.example
│   └── uploads/             # PDF files stored here (auto-created)
│
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js               # Root layout + chat state
        ├── index.js
        ├── index.css            # Design tokens + global styles
        ├── components/
        │   ├── DocumentPanel.js # Sidebar: upload, list, select docs
        │   └── ChatPanel.js     # Chat UI with SSE streaming
        └── utils/
            └── api.js           # Fetch helpers + SSE stream reader
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Upload a PDF (multipart/form-data) |
| GET | `/documents` | List all uploaded documents |
| DELETE | `/documents/{doc_id}` | Remove a document |
| POST | `/query/stream` | Ask a question (SSE stream) |

---

## How RAG Works Here

```
PDF Upload
    │
    ▼
pdfplumber → extract raw text
    │
    ▼
Chunker → 800-char chunks, 150-char overlap
    │
    ▼
Google text-embedding-004 → vector per chunk
    │
    ▼
Stored in NumPy array (in-memory)

Query Time
    │
    ▼
Embed the question → query vector
    │
    ▼
Cosine similarity vs all doc chunk vectors
    │
    ▼
Top-5 most relevant chunks retrieved
    │
    ▼
Prompt: question + context chunks → Gemini 2.0 Flash
    │
    ▼
Streamed response via Server-Sent Events
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `GOOGLE_API_KEY` error | Make sure `.env` is filled and server was restarted |
| CORS error in browser | Confirm backend is running on port 8000 |
| "Could not extract text" | PDF may be image-only/scanned; try OCR tools first |
| Port 3000 or 8000 in use | Change with `PORT=3001 npm start` or `--port 8001` |
| `npm install` fails | Ensure Node 18+: `node --version` |

---

## Extending

- **Persistent vector store**: swap NumPy for ChromaDB or Qdrant
- **Multi-user**: add auth (FastAPI-Users) + per-user document isolation
- **OCR support**: integrate `pytesseract` for scanned PDFs
- **Better chunking**: add semantic chunking with sentence boundaries
- **Reranking**: add a cross-encoder reranker before generation
