"""Extracción del serial de equipos a partir de fotografías mediante OCR.

Reconoce etiquetas típicas de etiquetas físicas: SN, S/N, Serial No., Serial Number,
Nº serie, Nº serial, No. de serie/serial, Part No., etc. y devuelve el valor siguiente.
"""

from __future__ import annotations

import io
import re

import pytesseract
from PIL import Image

_TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if _TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = _TESSERACT_CMD

_ETIQUETA = (
    r"(?:S/N|SN|Serial\s*(?:No\.?|Number)?|Serie(?:\s*No\.?)?|"
    r"N[º°]?\s*(?:[Nn]úmero|[Nn]umero\s*)?(?:de\s*)?(?:serie|serial)|"
    r"No\.?\s*(?:de\s*)?(?:serie|serial)|"
    r"Part\s*No\.?)"
)
_RE_ETIQUETA = re.compile(_ETIQUETA, re.IGNORECASE)
_RE_SERIAL = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\-/_.]{4,}$")

_PSMS = ("--psm 3", "--psm 6", "--psm 11")
_ROTACIONES = (0, 180)


def _limpiar(valor: str) -> str | None:
    t = valor.strip()
    if not t:
        return None
    m = _RE_ETIQUETA.match(t)
    if m:
        t = t[m.end():]
        t = t.lstrip(" .:=-")
    t = t.split()[0] if t else t
    t = re.sub(r"[.,;:]+$", "", t.strip())
    if not _RE_SERIAL.match(t):
        return None
    return t.upper()


def _desde_texto(txt: str) -> str | None:
    for m in _RE_ETIQUETA.finditer(txt):
        resto = txt[m.end():]
        if not resto:
            continue
        resto = resto.lstrip(" .:=-")
        token = resto.split(maxsplit=2)
        if not token:
            continue
        s = _limpiar(token[0])
        if s:
            return s
    latest_pos = -1
    mejor: str | None = None
    for m in _RE_ETIQUETA.finditer(txt):
        pos = m.start()
        if pos > latest_pos:
            rest = txt[m.end():].lstrip(" .:=-")
            tok = rest.split(maxsplit=2)
            if tok:
                s = _limpiar(tok[0])
                if s:
                    latest_pos = pos
                    mejor = s
    return mejor


def _ocr_variantes(data: bytes) -> list[Image.Image]:
    img = Image.open(io.BytesIO(data))
    # Modo RGB y escala para mejor precisión
    if img.mode != "RGB":
        img = img.convert("RGB")
    w, h = img.size
    variantes = []
    escala = 2.0 if max(w, h) >= 1500 else 3.0
    base = img.resize((int(w * escala), int(h * escala)), Image.LANCZOS) if escala > 1 else img
    for rot in _ROTACIONES:
        if rot:
            variantes.append(base.rotate(-rot, expand=True))
        else:
            variantes.append(base)
    return variantes


def extraer_serial_imagen(data: bytes) -> str | None:
    """Detecta el serial en la foto y devuelve el valor en mayúsculas (o None)."""
    try:
        variantes = _ocr_variantes(data)
    except Exception:
        return None
    for im in variantes:
        for psm in _PSMS:
            try:
                txt = pytesseract.image_to_string(im, config=psm)
            except Exception:
                continue
            s = _desde_texto(txt)
            if s:
                return s
    return None