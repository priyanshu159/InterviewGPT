# InterviewGPT

InterviewGPT is a full-stack AI interview-preparation workspace. It compares a PDF resume with a job description, creates a resume-aware knowledge base for chat, runs a structured mock interview, evaluates answers, and presents a performance report.

The application consists of a React/Vite frontend and a FastAPI backend. AI generation and evaluation use NVIDIA's OpenAI-compatible API with `meta/llama-3.1-8b-instruct`; resume retrieval uses SentenceTransformers and FAISS locally.

## What it does

- Creates accounts and authenticates users with 24-hour JWT bearer tokens.
- Accepts a PDF resume and a pasted job description.
- Generates an ATS-style analysis: match score, candidate summary, strengths, missing skills, and learning recommendations.
- Builds a FAISS vector store from the resume and job description, then answers questions grounded in the retrieved content.
- Runs a 50-question mock interview across aptitude, technical, behavioral, and HR rounds.
- Scores MCQs deterministically and theory answers with the LLM.
- Generates a final AI performance summary and saves its scores, topics, and feedback to SQLite.
- Shows account-level interview statistics and lets a user update their display name.

## Architecture

```text
React + Vite client (frontend/, port 5173)
        |
        | HTTP + Bearer token
        v
FastAPI API (backend/, port 8000)
  |-- SQLite / SQLAlchemy: users and completed interview reports
  |-- NVIDIA Llama API: ATS analysis, questions, evaluations, summaries
  `-- SentenceTransformers + FAISS: resume/JD retrieval for chat
```

## Project layout

```text
InterviewGPT/
|-- backend/
|   |-- app.py                 # FastAPI routes and interview controller
|   |-- database.py            # SQLite engine and SQLAlchemy session
|   |-- auth*.py, jwt_handler.py
|   |-- interview_report.py    # Persisted report model
|   |-- data_store.py          # Runtime interview state
|   |-- services/
|   |   |-- llm_service.py     # NVIDIA OpenAI-compatible client
|   |   |-- ollama_service.py  # Prompts, generation, evaluation
|   |   `-- rag_service.py     # Embeddings and FAISS operations
|   `-- requirements.txt
|-- frontend/
|   |-- src/pages/             # Login, dashboard, resume, interview, report, profile
|   |-- src/services/api.js    # Axios client and JWT interceptor
|   `-- package.json
`-- .gitignore
```

## Prerequisites

- Python 3 and `pip`
- Node.js and npm
- An NVIDIA API key with access to the configured model

The embedding model (`sentence-transformers/all-MiniLM-L6-v2`) is downloaded by SentenceTransformers the first time the resume vector store is created, so that first analysis needs internet access.

## Run locally

Open two terminals from the repository root.

### 1. Start the backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` with the API key (do not commit this file):

```env
NVIDIA_API_KEY=your_nvidia_api_key
```

Then start FastAPI:

```powershell
uvicorn app:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

The frontend's API base URL is currently fixed in `frontend/src/services/api.js` as `http://127.0.0.1:8000`. The backend CORS configuration permits Vite's default `localhost:5173` and `127.0.0.1:5173` origins.

## Typical user flow

1. Register, then log in.
2. In **Resume Intelligence**, upload a PDF resume and paste the target job description.
3. Review the ATS-style match analysis and ask grounded questions in Resume RAG Chat.
4. Start the AI interview and answer each question.
5. Review feedback after each answer, continue through all sections, and receive the final report.
6. Return to the dashboard to view saved aggregate results and recurring weak topics.

## Interview design

The backend currently runs a fixed 50-question sequence:

| Round | Questions | Question style | Notes |
| --- | ---: | --- | --- |
| Aptitude | 20 | MCQ | Topics rotate through aptitude subjects; difficulty progresses from beginner to intermediate to expert. |
| Technical | 10 | MCQ | Ten randomly selected topics from the configured technical-topic list; resume context may be supplied. |
| Behavioral | 10 | Theory | Questions rotate through competencies such as leadership, teamwork, and adaptability. |
| HR | 10 | Theory | Questions rotate through categories such as motivation, strengths, salary, and work culture. |

For MCQs, the server compares the answer with the generated correct answer and awards either 10 or 0. For theory questions, the LLM returns a score from 0 to 10 plus feedback and improvement suggestions. The final report contains overall and per-round scores, strengths, weak topics, feedback, a hiring recommendation, and recommended preparation topics.

## API summary

| Method | Endpoint | Purpose | Authentication |
| --- | --- | --- | --- |
| GET | `/` | Health-style backend message | No |
| POST | `/register` | Create an account | No |
| POST | `/login` | Return a JWT bearer token | No |
| GET / PUT | `/me` | Read or update the signed-in user's name | Yes |
| POST | `/analyze` | Analyze supplied resume and JD text | No |
| POST | `/analyze-resume` | Upload PDF, analyze it, and create the vector store | No |
| POST | `/chat` | Ask a retrieved-context resume/JD question | No |
| POST | `/start-interview` | Reset interview state and return the first question | Yes |
| POST | `/submit-answer` | Evaluate an answer and return the next question or final report | Yes |
| GET | `/interview-report` | Return current in-memory interview progress/history | No |
| GET | `/learning-plan` | Return current weak-topic counts | No |
| GET | `/interview-summary` | Generate a summary from current interview history | No |
| POST | `/end-interview` | End with a generated summary | No |
| GET | `/dashboard` | Return the signed-in user's saved report aggregates | Yes |

## Local data and generated files

When the backend is launched from `backend/`, it creates or uses the following local resources:

- `interviewgpt.db` — SQLite database containing `users` and `interview_reports`.
- `uploads/` — uploaded resume PDFs.
- `vectorstore/resume_jd.index` and `vectorstore/chunks.pkl` — FAISS index and source chunks for Resume RAG Chat.

These files, virtual environments, Node dependencies, and `.env` files are excluded by `.gitignore`.

## Current implementation notes

- `data_store.py` keeps the active interview entirely in module-level memory. A server restart loses it, and simultaneous users on one backend process can overwrite each other's active interview state.
- The FAISS store is also shared and replaced whenever a resume is analyzed. Resume chat is therefore not isolated per user or upload.
- Completed report summaries are written to SQLite and used for dashboard aggregates, but there is no endpoint yet to list or retrieve individual persisted reports.
- The `interview_type` field sent to `/start-interview` is accepted but the controller always starts the fixed sequence with the aptitude round.
- Authentication protects account, interview-start/submission, and dashboard endpoints. Resume analysis, RAG chat, and several report/helper endpoints are currently public.
- The JWT signing key and API base URL are currently hard-coded in source. Configure them externally before deploying beyond local development.

## Development helpers

Two simple backend scripts exercise the RAG layer after dependencies are installed:

```powershell
cd backend
python test_rag.py
python test_search.py
```

They create and query the same local vector store used by the application.

## Security note

Never commit `backend/.env` or an API key. For a production deployment, use a securely managed secret for the NVIDIA key and JWT signing key, restrict CORS to the deployed frontend domain, validate uploaded files and filenames, isolate data by user, and move interview state and vector indexes into durable per-user storage.
