from services.rag_service import create_vector_store

text = """
Python
Machine Learning
Deep Learning
FastAPI
LangChain
FAISS
"""

print(
    create_vector_store(text)
)