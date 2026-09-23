from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import bcrypt
import jwt
from jwt import InvalidTokenError

from app.core.config import settings
from app.core.errors import UnauthorizedError


MIN_PASSWORD_LENGTH = 10


def validate_password_policy(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres.")
    if password.strip() != password:
        raise ValueError("La contraseña no puede comenzar ni terminar con espacios.")


def hash_password(password: str) -> str:
    validate_password_policy(password)
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str, claims: Dict[str, Any] | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": subject,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "iat": now,
        "iss": "eticos-api",
    }
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
            issuer="eticos-api",
            options={"require": ["sub", "iat", "exp"]},
        )
    except InvalidTokenError as exc:
        raise UnauthorizedError("Sesión inválida o expirada.") from exc
