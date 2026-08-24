from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Text,
    DateTime
)

from datetime import datetime

from database import Base


class InterviewReport(Base):

    __tablename__ = "interview_reports"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer)

    candidate_name = Column(String)

    interview_date = Column(
        DateTime,
        default=datetime.utcnow
    )

    overall_score = Column(Float)

    aptitude_score = Column(Float)

    technical_score = Column(Float)

    behavioral_score = Column(Float)

    hr_score = Column(Float)

    strong_topics = Column(Text)

    weak_topics = Column(Text)

    ai_feedback = Column(Text)

    pdf_path = Column(String)