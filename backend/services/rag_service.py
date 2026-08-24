from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import pickle
import os


# ==========================================================
# Embedding Model
# ==========================================================

embedding_model = None


def get_embedding_model():

    global embedding_model

    if embedding_model is None:

        print("=" * 60)
        print("Loading Sentence Transformer Model...")
        print("=" * 60)

        embedding_model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

        print("=" * 60)
        print("Embedding Model Loaded Successfully")
        print("=" * 60)

    return embedding_model


# ==========================================================
# Vector Store Paths
# ==========================================================

INDEX_PATH = "vectorstore/resume_jd.index"
CHUNK_PATH = "vectorstore/chunks.pkl"


# ==========================================================
# Split Resume/JD into Overlapping Chunks
# ==========================================================

def split_text(
    text,
    chunk_size=800,
    overlap=200
):

    text = text.replace("\r", "").strip()

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start += chunk_size - overlap

    print(f"\nTotal Chunks Created : {len(chunks)}")

    return chunks


# ==========================================================
# Create Vector Store
# ==========================================================

def create_vector_store(text):

    if not text or not text.strip():
        raise ValueError("Resume/JD text is empty.")

    chunks = split_text(text)

    if not chunks:
        raise ValueError("No text chunks were created.")

    # Load embedding model only when required
    model = get_embedding_model()

    embeddings = model.encode(
        chunks,
        normalize_embeddings=True
    )

    dimension = embeddings.shape[1]

    index = faiss.IndexFlatIP(dimension)

    index.add(
        np.array(embeddings).astype("float32")
    )

    os.makedirs(
        "vectorstore",
        exist_ok=True
    )

    faiss.write_index(
        index,
        INDEX_PATH
    )

    with open(
        CHUNK_PATH,
        "wb"
    ) as f:

        pickle.dump(
            chunks,
            f
        )

    print("=" * 60)
    print("VECTOR STORE CREATED")
    print(f"Chunks : {len(chunks)}")
    print(f"Dimension : {dimension}")
    print("=" * 60)

    return len(chunks)


# ==========================================================
# Search Vector Store
# ==========================================================

def search_vector_store(
    query,
    k=8
):

    if not query or not query.strip():
        print("Search query is empty.")
        return []

    if not os.path.exists(INDEX_PATH):

        print("Vector index not found.")

        return []

    if not os.path.exists(CHUNK_PATH):

        print("Chunk file not found.")

        return []

    # Load embedding model only when required
    model = get_embedding_model()

    query_embedding = model.encode(
        [query],
        normalize_embeddings=True
    )

    index = faiss.read_index(
        INDEX_PATH
    )

    # Do not request more results than available
    k = min(
        k,
        index.ntotal
    )

    if k <= 0:

        print("Vector index is empty.")

        return []

    scores, indices = index.search(
        np.array(query_embedding).astype("float32"),
        k
    )

    with open(
        CHUNK_PATH,
        "rb"
    ) as f:

        chunks = pickle.load(f)

    results = []

    visited = set()

    print("\n")
    print("=" * 70)
    print("RETRIEVED CHUNKS")
    print("=" * 70)

    for score, idx in zip(
        scores[0],
        indices[0]
    ):

        if idx < 0:
            continue

        if idx >= len(chunks):
            continue

        chunk = chunks[idx]

        if chunk in visited:
            continue

        visited.add(chunk)

        print(
            f"\nScore : {score:.4f}"
        )

        print("-" * 70)

        print(chunk)

        print("-" * 70)

        results.append(chunk)

    print("=" * 70)

    return results