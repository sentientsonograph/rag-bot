import os
import uuid
import json
from pathlib import Path
from typing import List

from google import genai
from google.genai import types
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pdfplumber
import numpy as np
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
client = genai.Client(api_key=GOOGLE_API_KEY)

EMBED_MODEL   = "gemini-embedding-001"
GEN_MODEL     = "gemini-2.5-flash"
UPLOAD_DIR    = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
CHUNK_SIZE    = 800
CHUNK_OVERLAP = 150
TOP_K         = 5

app = FastAPI(title="RAG Bot API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

document_store: dict = {}

class QueryRequest(BaseModel):
    doc_ids: List[str]
    question: str

def extract_text(path: Path) -> str:
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    return text

def chunk_text(text: str) -> List[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start: start + CHUNK_SIZE])
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return [c.strip() for c in chunks if c.strip()]

def embed_texts(texts: List[str]) -> np.ndarray:
    result = client.models.embed_content(
        model=EMBED_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
    )
    return np.array([e.values for e in result.embeddings], dtype=np.float32)

def embed_query(query: str) -> np.ndarray:
    result = client.models.embed_content(
        model=EMBED_MODEL,
        contents=[query],
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
    )
    return np.array(result.embeddings[0].values, dtype=np.float32)

def cosine_sim(a: np.ndarray, B: np.ndarray) -> np.ndarray:
    return B @ a / (np.linalg.norm(B, axis=1) * np.linalg.norm(a) + 1e-10)

def retrieve(question: str, doc_ids: List[str]) -> List[tuple]:
    q = embed_query(question)
    scored = []
    for doc_id in doc_ids:
        doc = document_store.get(doc_id)
        if not doc:
            continue
        sims = cosine_sim(q, doc["embeddings"])
        for idx, score in enumerate(sims):
            scored.append((float(score), doc["chunks"][idx], doc["filename"]))
    scored.sort(reverse=True)
    return [(text, fname) for _, text, fname in scored[:TOP_K]]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")
    doc_id = str(uuid.uuid4())
    path   = UPLOAD_DIR / f"{doc_id}.pdf"
    path.write_bytes(await file.read())
    try:
        text = extract_text(path)
        if not text.strip():
            raise HTTPException(422, "Could not extract text (possibly a scanned PDF).")
        chunks     = chunk_text(text)
        embeddings = embed_texts(chunks)
        document_store[doc_id] = {
            "filename": file.filename, "chunks": chunks,
            "embeddings": embeddings, "char_count": len(text),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Processing failed: {e}")
    return {"doc_id": doc_id, "filename": file.filename,
            "chunks": len(chunks), "char_count": len(text)}

@app.get("/documents")
def list_documents():
    return [
        {"doc_id": k, "filename": v["filename"],
         "chunks": len(v["chunks"]), "char_count": v["char_count"]}
        for k, v in document_store.items()
    ]

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    if doc_id not in document_store:
        raise HTTPException(404, "Document not found.")
    del document_store[doc_id]
    p = UPLOAD_DIR / f"{doc_id}.pdf"
    if p.exists():
        p.unlink()
    return {"deleted": doc_id}

@app.post("/query/stream")
async def query_stream(req: QueryRequest):
    if not req.doc_ids:
        raise HTTPException(400, "Select at least one document.")
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty.")
    retrieved = retrieve(req.question, req.doc_ids)
    if not retrieved:
        raise HTTPException(404, "No relevant content found.")
    context = "\n\n".join(
        f"[Source {i} — {fname}]\n{text}"
        for i, (text, fname) in enumerate(retrieved, 1)
    )
    prompt = f"""You are a precise document assistant. Answer only from the provided excerpts.
If the answer isn't in the context, say so. Cite [Source N] when referencing specific parts.

CONTEXT:
{context}

QUESTION: {req.question}"""

    async def generate():
        sources = [{"index": i + 1, "filename": fname}
                   for i, (_, fname) in enumerate(retrieved)]
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
        for chunk in client.models.generate_content_stream(
            model=GEN_MODEL, contents=prompt,
        ):
            if chunk.text:
                yield f"data: {json.dumps({'type': 'text', 'content': chunk.text})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")