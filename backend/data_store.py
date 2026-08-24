interview_history = []

asked_questions = []

current_level = "beginner"

total_score = 0

questions_answered = 0

weak_topics = {}

last_question_type = ""

last_correct_answer = ""

last_explanation = ""

behavioral_categories = []
current_behavioral_category = ""
behavioral_question_index = 0

# -------------------------
# Interview Flow
# -------------------------

current_section = "aptitude"

current_question_number = 1

# Total Interview Questions
total_questions = 50

section_question_count = {
    "aptitude": 0,
    "technical": 0,
    "behavioral": 0,
    "hr": 0
}

interview_sections = [
    "aptitude",
    "technical",
    "behavioral",
    "hr"
]

# Section Wise Limits

section_limits = {
   "aptitude": 20,
    "technical": 10,
    "behavioral": 10,
    "hr": 10
}

hr_categories = []

current_hr_category = ""

hr_question_index = 0

behavioral_categories = []

current_behavioral_category = ""

behavioral_question_index = 0