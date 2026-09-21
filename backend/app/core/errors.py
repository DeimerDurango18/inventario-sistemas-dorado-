from __future__ import annotations

from typing import Any, Optional


class AppError(Exception):
    """Error de negocio con código estable para el frontend."""

    def __init__(self, message: str, code: Optional[str] = None) -> None:
        self.message = message
        self.code = code or "ERROR"
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, identidad: str) -> None:
        super().__init__(f"{identidad} no encontrado(a).", "NOT_FOUND")


class ConflictError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "CONFLICT")


class ValidationError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "VALIDATION")

class UnauthorizedError(AppError):
    def __init__(self, message: str = "No autorizado.") -> None:
        super().__init__(message, "UNAUTHORIZED")


class ForbiddenError(AppError):
    def __init__(self, message: str = "No tiene permisos para esta acción.") -> None:
        super().__init__(message, "FORBIDDEN")