from __future__ import annotations

from typing import Optional


class AppError(Exception):
    """Error de negocio con código estable para el frontend."""

    status_code = 400

    def __init__(self, message: str, code: Optional[str] = None) -> None:
        self.message = message
        self.code = code or "ERROR"
        super().__init__(message)


class NotFoundError(AppError):
    status_code = 404

    def __init__(self, identidad: str) -> None:
        super().__init__(f"{identidad} no encontrado(a).", "NOT_FOUND")


class ConflictError(AppError):
    status_code = 409

    def __init__(self, message: str) -> None:
        super().__init__(message, "CONFLICT")


class ValidationError(AppError):
    status_code = 422

    def __init__(self, message: str) -> None:
        super().__init__(message, "VALIDATION")


class UnauthorizedError(AppError):
    status_code = 401

    def __init__(self, message: str = "No autorizado.") -> None:
        super().__init__(message, "UNAUTHORIZED")


class ForbiddenError(AppError):
    status_code = 403

    def __init__(self, message: str = "No tiene permisos para esta acción.") -> None:
        super().__init__(message, "FORBIDDEN")


class ActaDownloadError(AppError):
    status_code = 403

    def __init__(self, message: str = "No tiene permisos para descargar actas.") -> None:
        super().__init__(message, "ACTA_FORBIDDEN")
