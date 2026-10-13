# DocuMind AI

**Ask your documents anything, with answers grounded in source evidence.**

DocuMind is a portfolio-ready AI document intelligence MVP. A user uploads a document, the app indexes it into a vector store, and the chat experience uses semantic + keyword retrieval before generating an answer. Relevant retrieved passages are shown below each response as source evidence.

## Why I built it

LLM chat interfaces are easy to prototype, but trustworthy document Q&A needs retrieval, grounding, good failure behavior, and a usable interface. DocuMind demonstrates the complete flow from file ingestion to retrieval-augmented answers.

## Features

- Drag-and-drop document upload
- PDF, DOCX, TXT, Markdown, PPTX, HTML, and JSON support
- Hosted vector-store indexing
- Retrieval-augmented question answering
- Multi-turn follow-up questions
- Source evidence shown beneath answers
- Responsive dashboard UI
- API keys kept server-side
- Temporary vector stores that expire after inactivity

## Stack

- Next.js + React + TypeScript
- Tailwind CSS
- OpenAI Responses API
- OpenAI File Search + Vector Stores
- Vercel-ready server routes

## Run locally

```bash
npm install
cp .env.example .env.local
# Add your OPENAI_API_KEY
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-6-luna
```

## Architecture

1. Browser uploads a document to `/api/upload`.
2. The server creates an expiring vector store and uploads/indexes the document.
3. The browser stores the returned vector-store ID for the active session.
4. Questions are sent to `/api/ask`.
5. The server calls the Responses API with the `file_search` tool.
6. DocuMind returns the grounded answer plus retrieved passages for source evidence.

## Portfolio talking points

- I designed the product around a real trust problem: users need to know *where* an answer came from.
- I used hosted retrieval rather than stuffing entire files into prompts, which improves relevance and scales better to larger documents.
- I keep the API key on the server and use short-lived knowledge stores for a safer portfolio demo.
- The assistant is instructed to say when the document does not support an answer instead of guessing.
- I intentionally kept auth and billing out of the MVP so the demo focuses on the core user outcome.

## Next improvements

- Authentication and saved workspaces
- Multiple documents per project
- Persistent document metadata in Postgres/Supabase
- Page-level citation UX
- Streaming responses
- Document comparison mode
- Team sharing and role-based access
