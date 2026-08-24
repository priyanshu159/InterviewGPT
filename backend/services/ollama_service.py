import json

from services.llm_service import call_llm


# ============================================================
# MODEL PLACEHOLDERS
# ============================================================

OLLAMA_FALLBACK_MODEL = None
OLLAMA_TECHNICAL_MODEL = None


# ============================================================
# COMMON HELPERS
# ============================================================

def _clean_llm_response(response_text):
    """Convert an LLM response into clean text without markdown fences."""
    if not isinstance(response_text, str):
        response_text = str(response_text)

    response_text = response_text.replace("```json", "")
    response_text = response_text.replace("```", "")
    return response_text.strip()


def _parse_json_response(response_text, label="LLM"):
    """Parse a JSON response and raise a clear error when invalid."""
    cleaned = _clean_llm_response(response_text)

    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        print("=" * 70)
        print(f"INVALID {label.upper()} JSON")
        print(cleaned)
        print("=" * 70)
        raise ValueError(
            f"LLM returned invalid JSON for {label}."
        ) from exc

    if not isinstance(value, dict):
        raise ValueError(
            f"LLM returned a JSON value instead of a JSON object for {label}."
        )

    return value


def _normalize_question(text):
    """Normalize question text for exact duplicate detection."""
    return " ".join(
        str(text or "").strip().casefold().split()
    )


# ============================================================
# RESUME + JD ATS ANALYSIS
# ============================================================

def analyze_resume_jd(resume_text, jd_text):

    prompt = f"""
You are a Senior ATS System, Technical Interviewer, Career Coach,
and Hiring Manager.

TASK:
Analyze the candidate's resume against the job description and generate
a complete ATS report.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

INSTRUCTIONS:

1. Extract candidate_name from the resume.

2. Calculate match_score from 0-100 based on:
   - Skills Match
   - Relevant Experience
   - Education
   - Projects
   - Tools & Technologies

3. Identify matching_skills that appear in both Resume and JD.

4. Identify missing_skills that appear in JD but are not present in Resume.

5. Generate strengths from the candidate profile.

6. Generate weaknesses or gaps compared to the JD.

7. Generate learning_recommendations to improve ATS score.

8. Generate candidate_summary:
   - Maximum 2 sentences
   - Maximum 40 words
   - Easy to read
   - No long paragraphs

9. Generate strengths:
   - Maximum 4 items
   - Each item maximum 5 words

10. Generate missing_skills:
    - Maximum 4 items
    - Most important skills only

11. Generate learning_recommendations:
    - Maximum 3 items
    - Each item maximum 8 words

12. Generate exactly:
    - 3 technical_questions
    - 3 behavioral_questions
    - 3 hr_questions
    - 3 dsa_questions

13. Recommend only 3 projects.

14. Recommend only 3 certifications.

15. Do NOT explain anything.

16. Do NOT return any text before or after JSON.

Return EXACTLY this JSON structure:

{{
    "candidate_name": "",
    "match_score": 0,
    "matching_skills": [],
    "missing_skills": [],
    "strengths": [],
    "weaknesses": [],
    "learning_recommendations": [],
    "recommended_projects": [],
    "recommended_certifications": [],
    "candidate_summary": "",
    "technical_questions": [],
    "behavioral_questions": [],
    "hr_questions": [],
    "dsa_questions": []
}}
"""

    response_text = call_llm(
        prompt=prompt,
        system_prompt=(
            "You are a Senior ATS System, Technical Interviewer, "
            "Career Coach, and Hiring Manager. Return only valid JSON."
        ),
        task="resume",
    )

    return _clean_llm_response(response_text)


# ============================================================
# RAG CHAT
# ============================================================

def rag_chat(context, question):

    prompt = f"""
You are an AI Resume Assistant.

Retrieved information from the candidate's Resume and Job Description:

======================================================
{context}
======================================================

User Question:
{question}

Instructions:

1. Answer ONLY using the retrieved information.

2. Never hallucinate.

3. Never invent projects, skills, experience, education, or technologies.

4. Never answer from your own knowledge.

5. Write in simple English.

6. Use a natural conversational style.

7. Use short paragraphs.

8. Use "-" for bullet points when useful.

9. Do not use markdown symbols such as *, **, #, or ```.

10. Never start with:
    - "Based on the provided context"
    - "Based on the provided information"
    - "According to the context"

11. If the requested information is unavailable, reply exactly:
"I couldn't find that information in your resume."

Answer:
"""

    response_text = call_llm(
        prompt=prompt,
        system_prompt="""
You are InterviewGPT's Resume Assistant.

Answer ONLY from the retrieved resume and job-description context.

Rules:
- Never hallucinate.
- Never invent projects or skills.
- Never answer from your own knowledge.
- If information is missing, say:
  "I couldn't find that information in your resume."
- Use simple, professional English.
- Use short paragraphs and bullets when useful.
""",
        task="chat",
    )

    return _clean_llm_response(response_text)


# ============================================================
# INTERVIEW QUESTION GENERATOR
# ============================================================

def generate_interview_question(
    context,
    interview_type,
    level,
    weak_topics,
    history,
    current_topic=None,
    behavioral_category=None,
    hr_category=None,
):
    """
    Generate exactly one validated interview question.

    Topic rotation is intentionally NOT handled here.
    The caller (app.py) owns current_topic and must move it after
    every completed technical/aptitude question.

    This function:
    - prevents exact duplicate questions
    - prevents duplicate rejected questions during retries
    - enforces round type
    - enforces difficulty
    - enforces MCQ structure
    - enforces theory structure
    - blocks aptitude-style questions in technical rounds
    - requires the current technical topic
    - detects an accidentally repeated technical topic
    """

    interview_type = str(interview_type or "").strip().lower()
    level = str(level or "beginner").strip().lower()
    history = history if isinstance(history, list) else []

    valid_rounds = {
        "aptitude",
        "technical",
        "behavioral",
        "hr",
    }

    if interview_type not in valid_rounds:
        raise ValueError(
            f"Invalid interview_type: {interview_type}"
        )

    valid_levels = {
        "beginner",
        "intermediate",
        "expert",
    }

    if level not in valid_levels:
        raise ValueError(
            f"Invalid difficulty level: {level}"
        )

    current_topic_text = str(current_topic or "").strip()
    behavioral_category_text = str(
        behavioral_category or ""
    ).strip()
    hr_category_text = str(
        hr_category or ""
    ).strip()

    # --------------------------------------------------------
    # Build complete previous-question history.
    # --------------------------------------------------------

    previous_questions = []
    previous_question_normalized = set()

    for item in history:
        if not isinstance(item, dict):
            continue

        question_text = str(
            item.get("question", "")
        ).strip()

        if not question_text:
            continue

        normalized = _normalize_question(question_text)

        if normalized not in previous_question_normalized:
            previous_question_normalized.add(normalized)
            previous_questions.append(question_text)

    previous_questions_text = "\n".join(
        f"{index}. {question}"
        for index, question in enumerate(
            previous_questions,
            start=1,
        )
    )

    if not previous_questions_text:
        previous_questions_text = "None"

    # --------------------------------------------------------
    # Technical topic repetition protection.
    #
    # IMPORTANT:
    # current_topic must be changed by app.py after each answer.
    # We only detect an accidental repeated topic here.
    # --------------------------------------------------------

    previous_technical_topics = []

    if interview_type == "technical":
        for item in history:
            if not isinstance(item, dict):
                continue

            if str(
                item.get("section", "")
            ).strip().lower() != "technical":
                continue

            topic = str(
                item.get("topic", "")
            ).strip()

            if topic:
                previous_technical_topics.append(topic)

        if (
            current_topic_text
            and previous_technical_topics
            and previous_technical_topics[-1].casefold()
            == current_topic_text.casefold()
        ):
            raise ValueError(
                "Technical topic was not advanced by app.py. "
                f"Current topic '{current_topic_text}' is the same "
                "as the previous technical topic."
            )

    # --------------------------------------------------------
    # Candidate context is used only for technical questions.
    # --------------------------------------------------------

    if interview_type == "technical":
        candidate_context = str(context or "").strip()[:2500]
    else:
        candidate_context = "Not Applicable"

    # --------------------------------------------------------
    # JSON format.
    # --------------------------------------------------------

    if interview_type in {"behavioral", "hr"}:
        json_format = """
{
    "question": "",
    "difficulty": "",
    "type": "theory",
    "options": [],
    "correct_answer": "",
    "explanation": ""
}
"""
    else:
        json_format = """
{
    "question": "",
    "difficulty": "",
    "type": "mcq",
    "options": ["", "", "", ""],
    "correct_answer": "",
    "explanation": ""
}
"""

    # --------------------------------------------------------
    # Main generation prompt.
    # --------------------------------------------------------

    prompt = f"""
Generate EXACTLY ONE interview question.

ROUND:
{interview_type}

DIFFICULTY:
{level}

CURRENT TOPIC:
{current_topic_text if current_topic_text else "Not specified"}

CURRENT BEHAVIORAL COMPETENCY:
{behavioral_category_text if behavioral_category_text else "Not specified"}

CURRENT HR CATEGORY:
{hr_category_text if hr_category_text else "Not specified"}

WEAK TOPICS:
{weak_topics}

QUESTIONS ALREADY ASKED:
{previous_questions_text}

PREVIOUS TECHNICAL TOPICS:
{previous_technical_topics if previous_technical_topics else "None"}

DUPLICATE PREVENTION:

Every question in QUESTIONS ALREADY ASKED has already been asked.

You MUST NOT:
- repeat an exact question
- paraphrase a previous question
- change only numbers
- change only names
- change only a scenario
- ask the same underlying question
- repeat a rejected question

The new question must test a genuinely different concept or angle.

CANDIDATE CONTEXT:
{candidate_context}

ROUND RULES:

APTITUDE:
- Generate ONLY aptitude MCQ questions.
- Use ONLY the current aptitude topic.
- Do not switch to another aptitude topic.
- Do not use candidate context.
- Do not generate technical, HR, or behavioral questions.
- Match the requested difficulty.

TECHNICAL:
- Generate ONLY technical interview questions.
- Use ONLY the CURRENT TECHNICAL TOPIC.
- Do not silently switch to another technical topic.
- Do not generate aptitude questions.
- Prefer practical implementation questions.
- Use resume context when useful.
- Prioritize projects, skills, internship, certifications, then JD.
- If topic is Python, stay within Python.
- If topic is Machine Learning, stay within Machine Learning.
- If topic is SQL, stay within SQL.
- If topic is DBMS, stay within DBMS.
- If topic is OOP, stay within OOP.
- If topic is Data Structures, stay within Data Structures.
- If topic is Computer Networks, stay within Computer Networks.
- If topic is Operating Systems, stay within Operating Systems.
- If topic is APIs, stay within APIs.
- If topic is Generative AI, stay within Generative AI.
- If topic is Projects, ask about project implementation.
- Never silently replace the current topic.

BEHAVIORAL:
- Generate ONLY one behavioral interview question.
- Use ONLY the current behavioral competency.
- Use STAR-style interviewing.
- Do not generate technical, aptitude, HR, coding, or factual questions.

HR:
- Generate ONLY one HR interview question.
- Use ONLY the current HR category.
- Theory question only.
- Do not generate technical, coding, SQL, DSA, aptitude,
  mathematics, probability, or logical-reasoning questions.

JSON FORMAT:
{json_format}

MANDATORY JSON RULES:

1. Return ONLY one JSON object.
2. No markdown.
3. No code block.
4. No explanatory text outside JSON.

MCQ:
1. type must be exactly "mcq".
2. options must contain exactly 4 strings.
3. No option may be empty.
4. All options must be different.
5. correct_answer must not be empty.
6. correct_answer must exactly match one option.
7. explanation must not be empty.
8. explanation must agree with correct_answer.
9. Solve and verify the question before returning it.

THEORY:
1. type must be exactly "theory".
2. options must be [].
3. correct_answer must be "".
4. explanation must not be empty.
"""

    # --------------------------------------------------------
    # Retry strategies.
    # --------------------------------------------------------

    retry_strategies = [
        "Choose a different concept within the current topic.",
        "Use a practical implementation scenario.",
        "Use a WHY question.",
        "Use a HOW question.",
        "Use a troubleshooting scenario.",
        "Use a comparison or design-decision question.",
        "Use another subtopic within the current topic.",
    ]

    rejected_questions = []
    max_retries = 7

    # --------------------------------------------------------
    # Generation loop.
    # --------------------------------------------------------

    for attempt in range(max_retries):

        print("=" * 70)
        print(
            f"QUESTION GENERATION ATTEMPT "
            f"{attempt + 1}/{max_retries}"
        )
        print("ROUND :", interview_type)
        print("TOPIC :", current_topic_text)
        print("LEVEL :", level)
        print("=" * 70)

        forbidden_questions = (
            previous_questions + rejected_questions
        )

        forbidden_text = "\n".join(
            f"- {question}"
            for question in forbidden_questions
            if str(question).strip()
        )

        if not forbidden_text:
            forbidden_text = "None"

        retry_instruction = ""

        if attempt > 0:
            strategy = retry_strategies[
                min(
                    attempt - 1,
                    len(retry_strategies) - 1,
                )
            ]

            retry_instruction = f"""
RETRY ATTEMPT {attempt + 1}

The previous generated question failed validation.

FORBIDDEN QUESTIONS:
{forbidden_text}

Generate a genuinely different question.

Do not repeat, paraphrase, or slightly modify a forbidden question.

Use this strategy:
{strategy}

Stay inside the CURRENT TOPIC.
"""

        try:
            response_text = call_llm(
                prompt=prompt + retry_instruction,
                system_prompt=f"""
You are an expert AI Interviewer.

Generate exactly ONE interview question for the
{interview_type} round.

Current topic:
{current_topic_text if current_topic_text else "Not specified"}

Current behavioral competency:
{behavioral_category_text if behavioral_category_text else "Not specified"}

Current HR category:
{hr_category_text if hr_category_text else "Not specified"}

Previously asked questions are forbidden.

You MUST:
- follow the requested round
- follow the current topic/category
- follow the requested difficulty
- avoid duplicate questions
- return exactly one valid JSON object

For technical questions, never switch away from the current topic.

For aptitude questions, return only aptitude MCQs.

For behavioral and HR questions, return theory questions.

MCQ:
- type = "mcq"
- exactly 4 unique non-empty options
- correct_answer matches exactly one option
- explanation is non-empty

Theory:
- type = "theory"
- options = []
- correct_answer = ""
- explanation is non-empty

Return ONLY JSON.
""",
                task=interview_type,
            )

            response_text = _clean_llm_response(
                response_text
            )

            question = _parse_json_response(
                response_text,
                label="interview question",
            )

        except Exception as exc:
            print("=" * 70)
            print("QUESTION GENERATION ATTEMPT ERROR")
            print(str(exc))
            print("=" * 70)
            continue

        # ----------------------------------------------------
        # Required fields.
        # ----------------------------------------------------

        required_fields = {
            "question",
            "difficulty",
            "type",
            "options",
            "correct_answer",
            "explanation",
        }

        missing_fields = sorted(
            required_fields.difference(question.keys())
        )

        if missing_fields:
            print(
                "MISSING REQUIRED FIELDS:",
                missing_fields,
            )
            rejected_questions.append(
                str(question.get("question", "")).strip()
            )
            continue

        # ----------------------------------------------------
        # Question text.
        # ----------------------------------------------------

        question_text = str(
            question.get("question", "")
        ).strip()

        if not question_text:
            print("EMPTY QUESTION")
            continue

        normalized_question = _normalize_question(
            question_text
        )

        # ----------------------------------------------------
        # Exact duplicate check.
        # ----------------------------------------------------

        if normalized_question in previous_question_normalized:
            print("DUPLICATE QUESTION DETECTED")
            rejected_questions.append(question_text)
            continue

        rejected_normalized = {
            _normalize_question(q)
            for q in rejected_questions
            if str(q).strip()
        }

        if normalized_question in rejected_normalized:
            print("REPEATED REJECTED QUESTION")
            continue

        # ----------------------------------------------------
        # Validate round-specific type.
        # ----------------------------------------------------

        expected_type = (
            "theory"
            if interview_type in {"behavioral", "hr"}
            else "mcq"
        )

        question_type = str(
            question.get("type", "")
        ).strip().lower()

        if question_type != expected_type:
            print("=" * 70)
            print("INVALID QUESTION TYPE")
            print("Expected :", expected_type)
            print("Received :", question.get("type"))
            print("=" * 70)

            rejected_questions.append(question_text)
            continue

        question["type"] = question_type

        # ----------------------------------------------------
        # Validate difficulty.
        # ----------------------------------------------------

        question_difficulty = str(
            question.get("difficulty", "")
        ).strip().lower()

        if question_difficulty != level:
            print("=" * 70)
            print("INVALID DIFFICULTY")
            print("Expected :", level)
            print("Received :", question_difficulty)
            print("=" * 70)

            rejected_questions.append(question_text)
            continue

        question["difficulty"] = level

        # ----------------------------------------------------
        # Aptitude safety filter.
        # ----------------------------------------------------

        if interview_type == "aptitude":

            invalid_terms = [
                "python programming",
                "write python code",
                "java programming",
                "sql query",
                "database design",
                "machine learning",
                "deep learning",
                "tensorflow",
                "pytorch",
                "neural network",
                "api design",
                "tell me about yourself",
                "biggest achievement",
                "what are your strengths",
                "biggest weakness",
                "career goal",
                "why should we hire you",
                "salary expectations",
                "willing to relocate",
                "describe a time when",
                "tell me about a time when",
                "leadership experience",
                "teamwork experience",
                "conflict with a teammate",
            ]

            if any(
                term in normalized_question
                for term in invalid_terms
            ):
                print("INVALID APTITUDE QUESTION")
                rejected_questions.append(question_text)
                continue

        # ----------------------------------------------------
        # Technical safety filter.
        # ----------------------------------------------------

        if interview_type == "technical":

            aptitude_terms = [
                "average age",
                "age of",
                "years old",
                "train travels",
                "speed of",
                "distance between",
                "profit percentage",
                "loss percentage",
                "selling price",
                "cost price",
                "percentage",
                "probability",
                "dice",
                "coin",
                "ratio",
                "mixture",
                "upstream",
                "downstream",
                "boat",
                "calendar",
                "clock",
                "time and work",
                "work together",
                "sequence of numbers",
                "next number",
                "simple interest",
                "compound interest",
                "discount",
                "permutation",
                "combination",
                "logical reasoning",
                "aptitude",
            ]

            if any(
                term in normalized_question
                for term in aptitude_terms
            ):
                print("INVALID TECHNICAL QUESTION")
                rejected_questions.append(question_text)
                continue

            # Require a current technical topic.
            if not current_topic_text:
                print("ERROR: CURRENT TECHNICAL TOPIC IS EMPTY")
                raise ValueError(
                    "current_topic is required for technical questions."
                )

        # ----------------------------------------------------
        # MCQ validation.
        # ----------------------------------------------------

        if question_type == "mcq":

            options = question.get("options")

            if not isinstance(options, list):
                print("OPTIONS ARE NOT A LIST")
                rejected_questions.append(question_text)
                continue

            if len(options) != 4:
                print(
                    "INVALID NUMBER OF OPTIONS:",
                    options,
                )
                rejected_questions.append(question_text)
                continue

            options = [
                str(option).strip()
                for option in options
            ]

            if any(not option for option in options):
                print("EMPTY OPTION DETECTED")
                rejected_questions.append(question_text)
                continue

            normalized_options = [
                option.casefold()
                for option in options
            ]

            if len(set(normalized_options)) != 4:
                print("DUPLICATE OPTIONS DETECTED")
                rejected_questions.append(question_text)
                continue

            question["options"] = options

            correct_answer = str(
                question.get("correct_answer", "")
            ).strip()

            if not correct_answer:
                print("EMPTY CORRECT ANSWER")
                rejected_questions.append(question_text)
                continue

            normalized_correct_answer = (
                correct_answer.casefold()
            )

            if (
                normalized_correct_answer
                not in normalized_options
            ):
                print("CORRECT ANSWER NOT IN OPTIONS")
                rejected_questions.append(question_text)
                continue

            correct_index = normalized_options.index(
                normalized_correct_answer
            )

            question["correct_answer"] = options[
                correct_index
            ]

            explanation = str(
                question.get("explanation", "")
            ).strip()

            if not explanation:
                print("EMPTY EXPLANATION")
                rejected_questions.append(question_text)
                continue

            question["explanation"] = explanation

        # ----------------------------------------------------
        # Theory validation.
        # ----------------------------------------------------

        elif question_type == "theory":

            options = question.get("options")

            if options != []:
                print("THEORY QUESTION HAS OPTIONS")
                rejected_questions.append(question_text)
                continue

            correct_answer = str(
                question.get("correct_answer", "")
            ).strip()

            if correct_answer != "":
                print(
                    "THEORY QUESTION HAS CORRECT ANSWER"
                )
                rejected_questions.append(question_text)
                continue

            explanation = str(
                question.get("explanation", "")
            ).strip()

            if not explanation:
                print("EMPTY THEORY EXPLANATION")
                rejected_questions.append(question_text)
                continue

            question["options"] = []
            question["correct_answer"] = ""
            question["explanation"] = explanation

        # ----------------------------------------------------
        # Final duplicate check.
        # ----------------------------------------------------

        final_normalized = _normalize_question(
            question.get("question", "")
        )

        if final_normalized in previous_question_normalized:
            print("FINAL DUPLICATE DETECTED")
            rejected_questions.append(question_text)
            continue

        # ----------------------------------------------------
        # Valid question.
        # ----------------------------------------------------

        print("=" * 70)
        print("VALID QUESTION ACCEPTED")
        print("ROUND :", interview_type)
        print("TOPIC :", current_topic_text)
        print("LEVEL :", level)
        print(json.dumps(question, indent=4))
        print("=" * 70)

        return question

    raise Exception(
        f"Unable to generate a valid non-duplicate "
        f"{interview_type} question after {max_retries} attempts."
    )


# ============================================================
# ANSWER EVALUATION
# ============================================================

def evaluate_answer(question, answer):

    prompt = f"""
You are a professional technical interviewer.

Interview Question:
{question}

Candidate Answer:
{answer}

Evaluate ONLY the candidate's answer.

If the answer is empty, "I don't know", "No idea", irrelevant,
or completely incorrect:
- score = 0
- explain the biggest problem
- provide correct_answer
- provide expected_answer
- provide improvements

If partially correct:
- reward the correct core idea
- explain what is missing
- provide correct_answer
- provide expected_answer
- provide improvements

If correct:
- provide positive feedback
- provide correct_answer
- provide expected_answer
- provide improvements if useful

SCORING:
0 = no answer, completely incorrect, or irrelevant
1-3 = very poor understanding
4-6 = partial understanding
7-8 = good understanding
9-10 = excellent and complete understanding

Do not be unnecessarily strict.
If the candidate identifies the correct core concept,
the score should generally be at least 4.

feedback:
- maximum 25 words
- mention only the biggest issue or strength

correct_answer:
- maximum 3 sentences
- maximum 100 words

expected_answer:
- maximum 4 sentences
- maximum 100 words
- interview-quality answer
- include a short example only when necessary
- code only for coding questions
- SQL examples only for SQL questions
- no markdown
- no bullet points

improvements:
- maximum 3 items
- each item under 10 words

Return ONLY valid JSON.

{{
    "score": 0,
    "feedback": "",
    "correct_answer": "",
    "expected_answer": "",
    "improvements": []
}}
"""

    try:
        response_text = call_llm(
            prompt=prompt,
            system_prompt="""
You are a professional technical interviewer.

Evaluate the candidate answer fairly.

Return ONLY one valid JSON object with:
- score
- feedback
- correct_answer
- expected_answer
- improvements

Do not return markdown.
Do not return code fences.
Do not return explanatory text outside JSON.
""",
            task="evaluation",
        )

        evaluation = _parse_json_response(
            response_text,
            label="answer evaluation",
        )

        required_fields = {
            "score",
            "feedback",
            "correct_answer",
            "expected_answer",
            "improvements",
        }

        missing_fields = sorted(
            required_fields.difference(evaluation.keys())
        )

        if missing_fields:
            raise ValueError(
                f"Missing evaluation fields: {missing_fields}"
            )

        return json.dumps(evaluation)

    except Exception as exc:
        print("=" * 70)
        print("ANSWER EVALUATION ERROR")
        print(str(exc))
        print("=" * 70)
        raise


# ============================================================
# INTERVIEW SUMMARY
# ============================================================

def generate_interview_summary(
    history,
    weak_topics,
    current_level,
):

    prompt = f"""
You are a Senior Technical Interviewer and Hiring Manager.

Analyze the candidate's complete interview performance.

INTERVIEW HISTORY:
{history}

WEAK TOPICS:
{weak_topics}

HIGHEST DIFFICULTY REACHED:
{current_level}

TASK:

1. Analyze overall performance.
2. Identify strengths.
3. Identify weaknesses.
4. Decide whether the candidate is interview-ready.
5. Recommend topics to improve.
6. Give scores from 0-100 for:
   - overall_score
   - aptitude_score
   - technical_score
   - behavioral_score
   - hr_score
7. Provide a short professional summary.

Return ONLY valid JSON.

{{
    "overall_score": 0,
    "aptitude_score": 0,
    "technical_score": 0,
    "behavioral_score": 0,
    "hr_score": 0,
    "overall_performance": "",
    "strong_topics": [],
    "weak_topics": [],
    "feedback": "",
    "hire_recommendation": "",
    "recommended_topics": [],
    "summary": ""
}}
"""

    response_text = call_llm(
        prompt=prompt,
        system_prompt="""
You are a Senior Technical Interviewer.

Analyze only the supplied interview history.

Return ONLY one valid JSON object.
Do not return markdown.
Do not return code fences.
Do not return explanatory text outside JSON.
""",
        task="summary",
    )

    return _clean_llm_response(response_text)