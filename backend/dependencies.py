from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from database import get_db
from auth_models import User
from jwt_handler import SECRET_KEY, ALGORITHM


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("user_id")

        if user_id is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        current_user = db_session.query(
            User
        ).filter(
            User.id == user_id
        ).first()

        if current_user is None:

            raise HTTPException(
                status_code=401,
                detail="User not found"
            )

        return current_user

    except JWTError:

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )