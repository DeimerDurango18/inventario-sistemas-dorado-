from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.schemas.common import ORMModel


class ArchivoRead(ORMModel):
    id: int
    entidad_tipo: str
    entidad_id: int
    tipo_documento: Optional[str] = None
    nombre_original: str
    ruta: Optional[str] = None
    mime: Optional[str] = None
    tamano: Optional[int] = None
    created_at: datetime