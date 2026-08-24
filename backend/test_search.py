from services.rag_service import search_vector_store

results = search_vector_store(
    "Python"
)

print(results)