# RAG Bot — PDF Document Intelligence

A full-stack Retrieval-Augmented Generation (RAG) app. Upload PDFs, select them, and chat with your documents using Google Gemini.

**Live app:** [https://rag-bot-gules.vercel.app](https://rag-bot-gules.vercel.app/)

---

## Deployment

| Layer | Platform | Notes |
|-------|----------|-------|
| Frontend | [Vercel](https://vercel.com) | Serves the React app at `https://rag-bot-gules.vercel.app` |
| Backend | [Render](https://render.com) | Hosts the FastAPI app; exposes the REST/SSE API consumed by the frontend |

### Environment variables

**Frontend (Vercel)**

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Base URL of the Render-hosted backend (e.g. `https://<your-backend>.onrender.com`) |

**Backend (Render)**

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key (used for `gemini-embedding-001` and `gemini-2.5-flash`) |
| `ALLOWED_ORIGINS` | Should include `https://rag-bot-gules.vercel.app` for CORS |

> Note: the in-memory NumPy vector store resets on every Render restart/redeploy. If persistence across deploys is needed, see [Extending](#extending) below for swapping in a persistent vector store.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                        │
│  https://rag-bot-gules.vercel.app                            │
│  React · DM Sans · Syne · Lucide Icons · react-markdown     │
│  ┌──────────────────┐  ┌──────────────────────────────────┐│
│  │  Document Panel  │  │         Chat Panel               ││
│  │  Upload / Select │  │  SSE streaming · Markdown render ││
│  └──────────────────┘  └──────────────────────────────────┘│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / SSE
┌──────────────────────────────▼──────────────────────────────┐
│                    BACKEND (Render)                          │
│                FastAPI · Python 3.11+                        │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ PDF Parse │  │  Chunker     │  │  Vector Store        │  │
│  │ pdfplumber│→ │  800 chars   │→ │  NumPy (in-memory)   │  │
│  └───────────┘  │  150 overlap │  └──────────────────────┘  │
│                 └──────────────┘                             │
│                        │                                     │
│            ┌───────────▼──────────────┐                     │
│            │   Google Gemini APIs     │                     │
│            │  gemini-embedding-001    │                     │
│            │  gemini-2.5-flash        │                     │
│            └──────────────────────────┘                     │
└────────────────────────────────────────────────────────────┘
```

---

## Usage

1. Visit **[https://rag-bot-gules.vercel.app](https://rag-bot-gules.vercel.app/)**
2. **Upload PDFs** — drag and drop or click "Drop PDFs or click to upload" in the sidebar
3. **Select documents** — click a document to toggle it (purple highlight = selected)
4. **Ask questions** — type in the chat box and press Enter
5. The bot retrieves the most relevant chunks and streams an answer with source citations

---

## Running Locally

```
Frontend → http://localhost:3000
Backend  → http://localhost:8000
```

Set `REACT_APP_API_URL=http://localhost:8000` in the frontend's local `.env` to point at your local backend instead of the deployed Render instance.

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

Base URL in production: your Render backend URL (set via `REACT_APP_API_URL` on Vercel).

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
Google gemini-embedding-001 → vector per chunk
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
Prompt: question + context chunks → Gemini 2.5 Flash
    │
    ▼
Streamed response via Server-Sent Events
```

---

## Extending

- **Persistent vector store**: swap NumPy for ChromaDB or Qdrant (recommended for Render, since local disk/memory doesn't persist across deploys)
- **Multi-user**: add auth (FastAPI-Users) + per-user document isolation
- **OCR support**: integrate `pytesseract` for scanned PDFs
- **Better chunking**: add semantic chunking with sentence boundaries
- **Reranking**: add a cross-encoder reranker before generation
