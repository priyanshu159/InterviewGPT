from fastapi import (FastAPI, UploadFile, File, Form, Depends, HTTPException)
from fastapi.middleware.cors import CORSMiddleware

import json
import os
import re
import random
import pdfplumber

from sqlalchemy.orm import Session
from sqlalchemy import func

import data_store

from services.question_validator import validate_question

# -----------------------------
# Ollama Service
# -----------------------------
from services.ollama_service import (
    analyze_resume_jd,
    rag_chat,
    generate_interview_question,
    evaluate_answer,
    generate_interview_summary
)

# -----------------------------
# RAG
# -----------------------------
from services.rag_service import (
    create_vector_store,
    search_vector_store
)

# -----------------------------
# Pydantic Models
# -----------------------------
from models import (
    AnalyzeInput,
    ChatInput,
    StartInterviewInput,
    InterviewAnswerInput,
    RegisterInput,
    LoginInput
)

# -----------------------------
# Authentication
# -----------------------------
from auth import hash_password, verify_password
from jwt_handler import create_access_token
from dependencies import get_current_user

# -----------------------------
# Database
# -----------------------------
from database import engine, get_db

from database import Base

from interview_report import InterviewReport

from auth_models import User

APTITUDE_TOPICS = [
    "Percentage",
    "Profit & Loss",
    "Time and Work",
    "Probability",
    "Ratio and Proportion",
    "Number Series",
    "Logical Reasoning",
    "Data Interpretation",
    "Speed Distance Time",
    "Puzzles",
    "Boats and Streams",
    "Ages",
    "Clocks",
    "Calendars"
]

TECHNICAL_TOPICS = [
    "Python",
    "Machine Learning",
    "SQL",
    "DBMS",
    "OOP",
    "Data Structures",
    "Computer Networks",
    "Operating Systems",
    "APIs",
    "Generative AI",
    "Projects"
]

ROUNDS = [
    "aptitude",
    "technical",
    "behavioral",
    "hr"
]

LEVELS = [
    "beginner",
    "intermediate",
    "expert"
]

# ============================================================
# INTERVIEW SECTION CONFIGURATION
# ============================================================

SECTION_ORDER = [
    "aptitude",
    "technical",
    "behavioral",
    "hr"
]

SECTION_LIMITS = {
    "aptitude": 20,
    "technical": 10,
    "behavioral": 10,
    "hr": 10
}

def normalize_answer(answer):

    answer = answer.strip().lower()

    answer = answer.replace("$", "")
    answer = answer.replace("rs.", "")
    answer = answer.replace("₹", "")
    answer = answer.replace(",", "")
    
    answer = re.sub(r"\s+", "", answer)

    try:
        return float(answer)

    except:

        return answer

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.get("/")
def home():
    return {"message": "InterviewGPT Backend Running"}


def extract_text_from_pdf(pdf_path):
    text = ""

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

    return text


@app.post("/analyze")
def analyze(data: AnalyzeInput):

    result = analyze_resume_jd(
        data.resume_text,
        data.jd_text
    )

    result = result.replace("```json", "")
    result = result.replace("```", "")
    result = result.strip()

    result = json.loads(result)

    return result


@app.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    jd_text: str = Form(...)
):

    file_path = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    with open(file_path, "wb") as f:
        f.write(await file.read())

    resume_text = extract_text_from_pdf(file_path)
    
    print("=" * 60)
    print("RESUME TEXT")
    print("=" * 60)
    print(resume_text[:1000])
    print("=" * 60)

    # Generate ATS Analysis
    result = analyze_resume_jd(
        resume_text,
        jd_text
    )

    print("LLM RESPONSE:")
    print(result)

    # Remove markdown if returned by LLM
    result = result.replace("```json", "")
    result = result.replace("```", "")
    result = result.strip()

    # Create RAG database using Resume + JD + ATS Analysis
    combined_text = f"""
    ========================
    RESUME
    ========================

    {resume_text}

    ========================
    JOB DESCRIPTION
    ========================

    {jd_text}
    """

    create_vector_store(combined_text)
    
    print("=" * 60)
    print("VECTOR STORE CREATED SUCCESSFULLY")
    print("=" * 60)

    # Convert JSON string to dictionary
    result = json.loads(result)

    data_store.candidate_name = result.get(
        "candidate_name",
        "Unknown Candidate"
    )

    return result


@app.post("/chat")
def chat(data: ChatInput):

    chunks = search_vector_store(data.question)

    if not chunks:
        return {
            "answer": "I couldn't find relevant information in the uploaded resume."
        }

    context = "\n\n".join(chunks)

    answer = rag_chat(
        context,
        data.question
    )

    return {
        "answer": answer
    }
    

# ============================================================
# INTERVIEW STATE HELPERS
# ============================================================

def clean_llm_json(response):
    """Convert Ollama output (dict or JSON string) to a dict."""
    if isinstance(response, dict):
        return response
    if response is None:
        raise ValueError("LLM returned no response.")
    text = str(response).strip()
    text = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"LLM returned invalid JSON: {text[:500]}") from exc


def active_topic():
    """Return the topic/category belonging to the current section only."""
    section = data_store.current_section
    if section in ("aptitude", "technical"):
        return str(getattr(data_store, "current_topic", "") or "").strip()
    if section == "behavioral":
        return str(getattr(data_store, "current_behavioral_category", "") or "").strip()
    if section == "hr":
        return str(getattr(data_store, "current_hr_category", "") or "").strip()
    return ""


def generation_state():
    """Build the three topic arguments expected by ollama_service.py."""
    section = data_store.current_section
    topic = active_topic()
    technical_topic = topic if section in ("aptitude", "technical") else ""
    behavioral_category = topic if section == "behavioral" else ""
    hr_category = topic if section == "hr" else ""
    return technical_topic, behavioral_category, hr_category


def prepare_question(raw_question):
    """Parse and validate a generated question."""
    question = clean_llm_json(raw_question)
    validate_question(question)

    qtype = str(question.get("type", "")).strip().lower()
    if qtype == "mcq":
        options = question.get("options", [])
        if not isinstance(options, list) or len(options) != 4:
            raise ValueError("MCQ must contain exactly 4 options.")
        options = [str(x).strip() for x in options]
        if any(not x for x in options):
            raise ValueError("MCQ contains an empty option.")
        if len(set(options)) != 4:
            raise ValueError("MCQ contains duplicate options.")
        correct = str(question.get("correct_answer", "")).strip()
        if not correct or correct not in options:
            raise ValueError("MCQ correct_answer is invalid.")
        if not str(question.get("explanation", "")).strip():
            raise ValueError("MCQ explanation is empty.")
        question["options"] = options
    elif "options" not in question:
        question["options"] = []

    return question


def generate_next_question(max_attempts=7):
    """Generate a question without changing the controller's topic."""
    context = ""
    if data_store.current_section == "technical":
        chunks = search_vector_store("candidate skills experience projects")
        context = "\n\n".join(chunks) if chunks else ""

    technical_topic, behavioral_category, hr_category = generation_state()

    for attempt in range(1, max_attempts + 1):
        print("=" * 70)
        print(f"QUESTION GENERATION ATTEMPT {attempt}/{max_attempts}")
        print("ROUND :", data_store.current_section)
        print("ACTIVE TOPIC/CATEGORY :", active_topic())
        print("LEVEL :", data_store.current_level)
        print("=" * 70)
        try:
            raw = generate_interview_question(
                context,
                data_store.current_section,
                data_store.current_level,
                data_store.weak_topics,
                data_store.interview_history,
                technical_topic,
                behavioral_category,
                hr_category,
            )
            return prepare_question(raw)
        except Exception as exc:
            print("QUESTION GENERATION FAILED:", str(exc))

    raise RuntimeError("Unable to generate a valid interview question after retries.")


def set_section_state(section):
    """Initialize only the state belonging to the new section."""
    data_store.current_section = section
    data_store.current_level = "beginner"

    if section == "technical":
        data_store.technical_question_count = 0
        data_store.current_topic = data_store.technical_topics[0]
    elif section == "behavioral":
        data_store.behavioral_question_index = 0
        data_store.current_behavioral_category = data_store.behavioral_categories[0]
        data_store.current_topic = ""  # prevent technical topic leakage
    elif section == "hr":
        data_store.hr_question_index = 0
        data_store.current_hr_category = data_store.hr_categories[0]
        data_store.current_topic = ""  # prevent technical topic leakage


def advance_topic_after_answer(section):
    """Advance the controller to the topic/category for the NEXT question."""
    if section == "aptitude":
        data_store.aptitude_question_count += 1
        if data_store.aptitude_question_count < SECTION_LIMITS["aptitude"]:
            data_store.current_topic = data_store.aptitude_topics[data_store.aptitude_question_count]

    elif section == "technical":
        data_store.technical_question_count += 1
        if data_store.technical_question_count < SECTION_LIMITS["technical"]:
            data_store.current_topic = data_store.technical_topics[data_store.technical_question_count]

    elif section == "behavioral":
        data_store.behavioral_question_index += 1
        if data_store.behavioral_question_index < len(data_store.behavioral_categories):
            data_store.current_behavioral_category = data_store.behavioral_categories[data_store.behavioral_question_index]

    elif section == "hr":
        data_store.hr_question_index += 1
        if data_store.hr_question_index < len(data_store.hr_categories):
            data_store.current_hr_category = data_store.hr_categories[data_store.hr_question_index]


def update_aptitude_level():
    if data_store.current_section != "aptitude":
        return
    n = data_store.aptitude_question_count + 1
    if n <= 8:
        data_store.current_level = "beginner"
    elif n <= 17:
        data_store.current_level = "intermediate"
    else:
        data_store.current_level = "expert"


def store_question_state(question):
    data_store.last_question_type = str(question.get("type", "theory") or "theory").lower()
    data_store.last_correct_answer = str(question.get("correct_answer", ""))
    data_store.last_explanation = str(question.get("explanation", ""))


def public_question(question):
    question = dict(question)
    question.pop("correct_answer", None)
    if "options" not in question:
        question["options"] = []
    section_titles = {
        "aptitude": "Aptitude Round",
        "technical": "Technical Round",
        "behavioral": "Behavioral Round",
        "hr": "HR Round",
    }
    question["section"] = section_titles[data_store.current_section]
    question["question_number"] = data_store.current_question_number
    question["total_questions"] = data_store.total_questions
    question["topic"] = active_topic()
    return question


@app.post("/start-interview")
def start_interview(data: StartInterviewInput,current_user: User = Depends(get_current_user)):
    # Reset interview state.
    data_store.interview_history = []
    data_store.asked_questions = []
    data_store.total_score = 0
    data_store.questions_answered = 0
    data_store.current_level = "beginner"
    data_store.current_section = "aptitude"
    data_store.current_question_number = 1
    data_store.total_questions = sum(SECTION_LIMITS.values())
    data_store.completed_topics = []
    data_store.weak_topics = {}

    # Aptitude: 20 questions. First cover every topic once,
    # then fill the remaining slots with random topics.
    data_store.aptitude_question_count = 0
    remaining = SECTION_LIMITS["aptitude"] - len(APTITUDE_TOPICS)
    data_store.aptitude_topics = (
        random.sample(APTITUDE_TOPICS, len(APTITUDE_TOPICS))
        + random.choices(APTITUDE_TOPICS, k=max(0, remaining))
    )
    data_store.current_topic = data_store.aptitude_topics[0]

    # Technical: exactly 10 unique topics for the 10 technical questions.
    data_store.technical_question_count = 0
    data_store.technical_topics = random.sample(
        TECHNICAL_TOPICS,
        min(SECTION_LIMITS["technical"], len(TECHNICAL_TOPICS)),
    )

    data_store.section_question_count = {
        "aptitude": 0,
        "technical": 0,
        "behavioral": 0,
        "hr": 0,
    }

    # ============================================================
    # BEHAVIORAL CATEGORIES
    # ============================================================

    BEHAVIORAL_CATEGORIES = [
        "Leadership",
        "Teamwork",
        "Communication",
        "Conflict Resolution",
        "Problem Solving",
        "Adaptability",
        "Decision Making",
        "Time Management",
        "Handling Pressure",
        "Failure and Learning"
    ]

    data_store.behavioral_categories = random.sample(
        BEHAVIORAL_CATEGORIES,
        len(BEHAVIORAL_CATEGORIES)
    )

    data_store.behavioral_question_index = 0

    data_store.current_behavioral_category = (
        data_store.behavioral_categories[0]
    )


    # ============================================================
    # HR CATEGORIES
    # ============================================================

    HR_CATEGORIES = [
        "Introduction",
        "Career Goals",
        "Motivation",
        "Company Interest",
        "Strengths",
        "Weaknesses",
        "Career Plans",
        "Relocation",
        "Salary Expectations",
        "Work Culture"
    ]

    data_store.hr_categories = random.sample(
        HR_CATEGORIES,
        len(HR_CATEGORIES)
    )

    data_store.hr_question_index = 0

    data_store.current_hr_category = (
        data_store.hr_categories[0]
    )

    question = generate_next_question()
    store_question_state(question)

    return public_question(question)


@app.post("/submit-answer")
def submit_answer(
    data: InterviewAnswerInput,
    current_user=Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    # Capture state BEFORE advancing to the next topic.
    answered_section = data_store.current_section
    answered_topic = active_topic()
    answered_level = data_store.current_level

    # Evaluate MCQ or long-form answer.
    if data_store.last_question_type == "mcq":
        print("=" * 60)
        print("USER ANSWER :", data.answer)
        print("CORRECT ANSWER :", data_store.last_correct_answer)
        print("=" * 60)

        if normalize_answer(data.answer) == normalize_answer(data_store.last_correct_answer):
            score = 10
            result = {
                "is_correct": True,
                "message": "Correct Answer",
                "correct_answer": data_store.last_correct_answer,
                "explanation": data_store.last_explanation,
            }
        else:
            score = 0
            result = {
                "is_correct": False,
                "message": "Incorrect Answer",
                "correct_answer": data_store.last_correct_answer,
                "explanation": data_store.last_explanation,
            }
    else:
        result = clean_llm_json(evaluate_answer(data.question, data.answer))
        score = result.get("score", 0)
        try:
            score = float(score)
        except (ValueError, TypeError):
            score = 0
        result.pop("score", None)
        result.pop("expected_answer", None)

    # Store history using server-side topic/category, not a stale frontend topic.
    history_item = {
        "question": data.question,
        "answer": data.answer,
        "score": score,
        "section": answered_section,
        "level": answered_level,
        "topic": answered_topic,
    }
    data_store.interview_history.append(history_item)

    data_store.total_score += score
    data_store.questions_answered += 1

    if score <= 4 and answered_topic:
        data_store.weak_topics[answered_topic] = data_store.weak_topics.get(answered_topic, 0) + 1


    # Advance the next topic/category only AFTER saving the current answer.
    advance_topic_after_answer(answered_section)
    update_aptitude_level()

    data_store.section_question_count[answered_section] += 1

    print("=" * 70)
    print("CURRENT SECTION :", answered_section)
    print("SECTION COUNT :", data_store.section_question_count[answered_section])
    print("ALL SECTION COUNTS :", data_store.section_question_count)
    print("ANSWERED TOPIC :", answered_topic)
    print("=" * 70)

    # Move to the next section when the current section is complete.
    if data_store.section_question_count[answered_section] >= SECTION_LIMITS[answered_section]:
        current_index = SECTION_ORDER.index(answered_section)

        if current_index < len(SECTION_ORDER) - 1:
            next_section = SECTION_ORDER[current_index + 1]
            print("SECTION COMPLETED:", answered_section)
            print("NEXT SECTION:", next_section)
            set_section_state(next_section)
        else:
            # All sections completed.
            report_raw = generate_interview_summary(
                data_store.interview_history,
                data_store.weak_topics,
                data_store.current_level,
            )
            report = clean_llm_json(report_raw)

            interview_report = InterviewReport(
                user_id=current_user.id,
                candidate_name=getattr(data_store, "candidate_name", "Unknown Candidate"),
                overall_score=report.get("overall_score", 0),
                aptitude_score=report.get("aptitude_score", 0),
                technical_score=report.get("technical_score", 0),
                behavioral_score=report.get("behavioral_score", 0),
                hr_score=report.get("hr_score", 0),
                strong_topics=json.dumps(report.get("strong_topics", [])),
                weak_topics=json.dumps(report.get("weak_topics", [])),
                ai_feedback=report.get("feedback", ""),
                pdf_path="",
            )
            db_session.add(interview_report)
            db_session.commit()

            return {
                "evaluation": result,
                "interview_completed": True,
                "report": report,
            }

    # Generate the next question using the NEW section/topic state.
    next_question = generate_next_question()
    store_question_state(next_question)

    data_store.current_question_number += 1
    next_question = public_question(next_question)

    print("=" * 70)
    print("NEXT ROUND :", data_store.current_section)
    print("NEXT TOPIC/CATEGORY :", active_topic())
    print("NEXT LEVEL :", data_store.current_level)
    print("=" * 70)

    return {
        "evaluation": result,
        "next_question": next_question,
        "interview_completed": False,
    }


@app.get("/interview-report")
def interview_report():

    if data_store.questions_answered == 0:
        return {
            "message": "No interview completed yet."
        }

    avg_score = (
        data_store.total_score /
        data_store.questions_answered
    )

    return {
        "questions_answered": data_store.questions_answered,
        "average_score": round(avg_score, 2),
        "difficulty_reached": data_store.current_level,
        "history": data_store.interview_history
    }
    
    
@app.get("/learning-plan")
def learning_plan():

    return {
        "weak_topics": data_store.weak_topics
    }
    
@app.get("/interview-summary")
def interview_summary():

    result = generate_interview_summary(
        data_store.interview_history,
        data_store.weak_topics,
        data_store.current_level
    )

    result = result.replace("```json", "")
    result = result.replace("```", "")
    result = result.strip()

    result = json.loads(result)

    return result


@app.post("/end-interview")
def end_interview():

    summary = generate_interview_summary(
        data_store.interview_history,
        data_store.weak_topics,
        data_store.current_level
    )

    summary = summary.replace("```json", "")
    summary = summary.replace("```", "")
    summary = summary.strip()

    summary = json.loads(summary)

    return {
        "questions_answered":
            data_store.questions_answered,

        "difficulty_reached":
            data_store.current_level,

        "weak_topics":
            data_store.weak_topics,

        "summary":
            summary
    }
    
    
@app.get("/dashboard")
def dashboard(
    current_user=Depends(get_current_user),
    db_session: Session = Depends(get_db)
):

    reports = db_session.query(
        InterviewReport
    ).filter(
        InterviewReport.user_id == current_user.id
    ).all()

    total_interviews = len(reports)

    if total_interviews == 0:

        average_score = 0
        highest_score = 0
        lowest_score = 0

    else:

        scores = []

        for report in reports:

            if report.overall_score is not None:

                scores.append(
                    report.overall_score
                )

        if len(scores) == 0:

            average_score = 0
            highest_score = 0
            lowest_score = 0

        else:

            average_score = round(
                sum(scores) / len(scores),
                2
            )

            highest_score = max(scores)

            lowest_score = min(scores)

    weak_topic_data = {}

    for report in reports:

        if report.weak_topics:

            try:

                topics = json.loads(
                    report.weak_topics
                )

                for topic in topics:

                    weak_topic_data[topic] = (
                        weak_topic_data.get(
                            topic,
                            0
                        ) + 1
                    )

            except Exception:

                pass

    return {

        "total_interviews":
            total_interviews,

        "average_score":
            average_score,

        "highest_score":
            highest_score,

        "lowest_score":
            lowest_score,

        "difficulty_reached":
            data_store.current_level,

        "weak_topics":
            weak_topic_data
    }
    
@app.post("/register")
def register(
    data: RegisterInput,
    db_session: Session = Depends(get_db)
):

    existing_user = db_session.query(
        User
    ).filter(
        User.email == data.email
    ).first()

    if existing_user:

        return {
            "message":
            "Email already exists"
        }

    user = User(
        name=data.name,
        email=data.email,
        password=hash_password(
            data.password
        )
    )

    db_session.add(user)

    db_session.commit()

    return {
        "message":
        "Registration successful"
    }
    
    
@app.post("/login")
def login(
    data: LoginInput,
    db_session: Session = Depends(get_db)
):

    user = db_session.query(
        User
    ).filter(
        User.email == data.email
    ).first()

    if not user:

        return {
            "message": "User not found"
        }

    if not verify_password(
        data.password,
        user.password
    ):

        return {
            "message": "Invalid password"
        }

    token = create_access_token(
        {
            "email": user.email,
            "user_id": user.id
        }
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer"
    }
    
@app.get("/me")
def me(
    current_user=Depends(
        get_current_user
    )
):

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    }




from pydantic import BaseModel


class UpdateProfileInput(BaseModel):
    name: str



@app.put("/me")
def update_profile(
    data: UpdateProfileInput,
    current_user=Depends(
        get_current_user
    ),
    db_session: Session = Depends(get_db)
):

    name = data.name.strip()

    if not name:

        raise HTTPException(
            status_code=400,
            detail="Name cannot be empty"
        )

    current_user.name = name

    db_session.commit()

    db_session.refresh(
        current_user
    )

    return {
        "message":
            "Profile updated successfully",

        "user": {
            "id":
                current_user.id,

            "name":
                current_user.name,

            "email":
                current_user.email
        }
    }