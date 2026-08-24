import os
import pickle
import requests
import faiss
import numpy as np
from dotenv import load_dotenv


# ==========================================================
# ENVIRONMENT VARIABLES
# ==========================================================

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

if not NVIDIA_API_KEY:
    raise RuntimeError(
        "NVIDIA_API_KEY is not set in the environment variables."
    )


# ==========================================================
# NVIDIA EMBEDDING API
# ==========================================================

NVIDIA_EMBEDDING_URL = (
    "https://integrate.api.nvidia.com/v1/embeddings"
)

EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5"


def get_embeddings(texts, input_type="passage"):

    if not texts:
        return np.array([], dtype="float32")

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "input": texts,
        "model": EMBEDDING_MODEL,
        "input_type": input_type,
        "encoding_format": "float"
    }

    response = requests.post(
        NVIDIA_EMBEDDING_URL,
        headers=headers,
        json=payload,
        timeout=120
    )

    response.raise_for_status()

    data = response.json()

    embeddings = [
        item["embedding"]
        for item in data["data"]
    ]

    return np.array(
        embeddings,
        dtype="float32"
    )


# ==========================================================
# VECTOR STORE PATHS
# ==========================================================

INDEX_PATH = "vectorstore/resume_jd.index"
CHUNK_PATH = "vectorstore/chunks.pkl"


# ==========================================================
# SPLIT RESUME / JD INTO OVERLAPPING CHUNKS
# ==========================================================

def split_text(
    text,
    chunk_size=800,
    overlap=200
):

    if not text:
        return []

    text = text.replace(
        "\r",
        ""
    ).strip()

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start += chunk_size - overlap

    print(
        f"\nTotal Chunks Created : {len(chunks)}"
    )

    return chunks


# ==========================================================
# CREATE VECTOR STORE
# ==========================================================

def create_vector_store(text):

    if not text or not text.strip():

        raise ValueError(
            "Resume/JD text is empty."
        )

    chunks = split_text(
        text
    )

    if not chunks:

        raise ValueError(
            "No text chunks were created."
        )

    print("=" * 60)
    print("Generating NVIDIA Embeddings...")
    print("=" * 60)

    embeddings = get_embeddings(
        chunks,
        input_type="passage"
    )

    if embeddings.size == 0:

        raise ValueError(
            "No embeddings were generated."
        )

    dimension = embeddings.shape[1]

    # ------------------------------------------------------
    # FAISS INNER PRODUCT INDEX
    # ------------------------------------------------------

    index = faiss.IndexFlatIP(
        dimension
    )

    index.add(
        embeddings
    )

    # ------------------------------------------------------
    # CREATE VECTORSTORE DIRECTORY
    # ------------------------------------------------------

    os.makedirs(
        "vectorstore",
        exist_ok=True
    )

    # ------------------------------------------------------
    # SAVE FAISS INDEX
    # ------------------------------------------------------

    faiss.write_index(
        index,
        INDEX_PATH
    )

    # ------------------------------------------------------
    # SAVE CHUNKS
    # ------------------------------------------------------

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
    print(f"Chunks     : {len(chunks)}")
    print(f"Dimension  : {dimension}")
    print("=" * 60)

    return len(chunks)


# ==========================================================
# SEARCH VECTOR STORE
# ==========================================================

def search_vector_store(
    query,
    k=8
):

    if not query or not query.strip():

        print(
            "Search query is empty."
        )

        return []

    # ------------------------------------------------------
    # CHECK VECTOR INDEX
    # ------------------------------------------------------

    if not os.path.exists(
        INDEX_PATH
    ):

        print(
            "Vector index not found."
        )

        return []

    # ------------------------------------------------------
    # CHECK CHUNK FILE
    # ------------------------------------------------------

    if not os.path.exists(
        CHUNK_PATH
    ):

        print(
            "Chunk file not found."
        )

        return []

    print("=" * 60)
    print("Generating Query Embedding...")
    print("=" * 60)

    query_embedding = get_embeddings(
        [query],
        input_type="query"
    )

    # ------------------------------------------------------
    # LOAD FAISS INDEX
    # ------------------------------------------------------

    index = faiss.read_index(
        INDEX_PATH
    )

    # ------------------------------------------------------
    # LIMIT K TO AVAILABLE DOCUMENTS
    # ------------------------------------------------------

    k = min(
        k,
        index.ntotal
    )

    if k <= 0:

        print(
            "Vector index is empty."
        )

        return []

    # ------------------------------------------------------
    # SEARCH
    # ------------------------------------------------------

    scores, indices = index.search(
        query_embedding,
        k
    )

    # ------------------------------------------------------
    # LOAD CHUNKS
    # ------------------------------------------------------

    with open(
        CHUNK_PATH,
        "rb"
    ) as f:

        chunks = pickle.load(
            f
        )

    results = []

    visited = set()

    print("\n")
    print("=" * 70)
    print("RETRIEVED CHUNKS")
    print("=" * 70)

    # ------------------------------------------------------
    # COLLECT RESULTS
    # ------------------------------------------------------

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

        visited.add(
            chunk
        )

        print(
            f"\nScore : {score:.4f}"
        )

        print(
            "-" * 70
        )

        print(
            chunk
        )

        print(
            "-" * 70
        )

        results.append(
            chunk
        )

    print(
        "=" * 70
    )

    return results