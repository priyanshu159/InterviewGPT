from pydantic import BaseModel

class AnalyzeInput(BaseModel):
    resume_text: str
    jd_text: str
    
class ChatInput(BaseModel):
    question: str
    
class StartInterviewInput(BaseModel):
    interview_type: str
    
class InterviewAnswerInput(BaseModel):
    question: str
    answer: str
    topic: str
    
class RegisterInput(BaseModel):
    name: str
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str