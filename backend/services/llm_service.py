from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

if not NVIDIA_API_KEY:
    raise RuntimeError(
        "NVIDIA_API_KEY is not set in the .env file."
    )

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=NVIDIA_API_KEY
)

MODEL_NAME = "meta/llama-3.1-8b-instruct"


def call_llm(prompt, system_prompt="", task="general"):

    response = client.chat.completions.create(
        model=MODEL_NAME,

        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.1,
        top_p=0.9,

        frequency_penalty=0.0,
        presence_penalty=0.0,

        max_tokens=600
    )

    return response.choices[0].message.content