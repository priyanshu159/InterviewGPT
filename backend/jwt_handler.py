from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone


SECRET_KEY = "interviewgpt_secret_key"
ALGORITHM = "HS256"


def create_access_token(data):
    payload = data.copy()

    payload["exp"] = (
        datetime.now(timezone.utc)
        + timedelta(hours=24)
    )

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def verify_token(token):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except JWTError as e:
        print("JWT VERIFICATION ERROR:", e)
        return None