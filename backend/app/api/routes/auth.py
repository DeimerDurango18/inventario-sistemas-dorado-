from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import authenticate, build_token_response, get_current_user
from app.core.database import get_db
from app.core.errors import UnauthorizedError
from app.models.user import Usuario
from app.schemas.common import Message
from app.schemas.user import ChangePasswordRequest, LoginRequest, TokenResponse, UsuarioRead
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# Defensa ligera contra fuerza bruta. En despliegues multi-instancia debe
# sustituirse/complementarse con rate limiting en el proxy/WAF.
_attempts: dict[str, deque[float]] = defaultdict(deque)
_WINDOW = 60.0
_MAX_ATTEMPTS = 8


def _check_login_rate(request: Request) -> str:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _attempts[ip]
    while bucket and now - bucket[0] > _WINDOW:
        bucket.popleft()
    if len(bucket) >= _MAX_ATTEMPTS:
        raise UnauthorizedError("Demasiados intentos. Espera un minuto e inténtalo de nuevo.")
    bucket.append(now)
    return ip


def _login(request: Request, username: str, password: str, db: Session) -> TokenResponse:
    _check_login_rate(request)
    user = authenticate(db, username, password)
    # Un login correcto reinicia el contador de esa IP.
    ip = request.client.host if request.client else "unknown"
    _attempts.pop(ip, None)
    return build_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    return _login(request, data.username, data.password, db)


@router.post("/token", response_model=TokenResponse, include_in_schema=False)
def token(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return _login(request, form.username, form.password, db)


@router.get("/me", response_model=UsuarioRead)
def me(user: Usuario = Depends(get_current_user)):
    return user


@router.put("/cambio-password", response_model=Message)
def cambiar_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    auth_service.change_password(db, user, data.current_password, data.new_password)
    return Message(success=True, message="Contraseña actualizada correctamente.")
