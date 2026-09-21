from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import (
    build_token_response,
    get_current_user,
    authenticate,
)
from app.core.database import get_db
from app.core.errors import UnauthorizedError
from app.models.user import Usuario
from app.schemas.common import Message
from app.schemas.user import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate(db, data.username, data.password)
    return build_token_response(user)


@router.post("/token", response_model=TokenResponse, include_in_schema=False)
def token(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate(db, form.username, form.password)
    return build_token_response(user)


@router.get("/me", response_model=TokenResponse)
def me(user: Usuario = Depends(get_current_user)):
    return build_token_response(user)