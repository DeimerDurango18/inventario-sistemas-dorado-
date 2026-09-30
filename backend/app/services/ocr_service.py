"""Extracción del serial de equipos a partir de fotografías mediante OCR.

Reconoce etiquetas típicas de etiquetas físicas: SN, S/N, Serial No., Serial Number,
Nº serie, Nº serial, No. de serie/serial, Part No., etc. y devuelve el valor siguiente.

La imagen se procesa en varias variantes (escala, rotación a 0/90/180/270 grados y
binarización) porque las fotografías de campo llegan rotadas o con baja calidad.
"""

from __future__ import annotations

import io
import re

import pytesseract
from PIL import Image, ImageOps, ImageEnhance

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
# Los seriales de equipo reales suelen incluir dígitos; esta regla frena
# los falsos positivos de OCR (p. ej. "ADOUMILS", "OLOQY").
_RE_DIGITOS = re.compile(r"[0-9]")

# Orden de prueba de modos de imagen y PSM (más eficaces primero)
_MODOS = ("orig", "thr")
_PSMS = (6, 11)


def _limpiar(valor: str) -> str | None:
    t = valor.strip()
    if not t:
        return None
    # Si el OCR pegó la etiqueta al valor ("SerialNo.MXL123...")
    m = _RE_ETIQUETA.match(t)
    if m:
        t = t[m.end():]
        t = t.lstrip(" .:=-")
    t = t.split()[0] if t else t
    t = re.sub(r"[.,;:]+$", "", t.strip())
    if not _RE_SERIAL.match(t):
        return None
    if not _RE_DIGITOS.search(t):
        return None
    return t.upper()


def _desde_texto(txt: str) -> str | None:
    mejor: str | None = None
    ultima_pos = -1
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
            # Prefiere la etiqueta que aparece más a la derecha (suele ser la del serial)
            if m.start() > ultima_pos:
                mejor = s
                ultima_pos = m.start()
    return mejor


def _binarizar(im: Image.Image) -> Image.Image:
    return im.point(lambda p: 255 if p > 150 else 0)


def _variantes(data: bytes):
    img = Image.open(io.BytesIO(data))
    if img.mode != "RGB":
        img = img.convert("RGB")
    w, h = img.size
    escala = 3.0 if max(w, h) < 1100 else (2.0 if max(w, h) < 1800 else 1.6)
    base = img.resize((int(w * escala), int(h * escala)), Image.LANCZOS)
    for rot in (0, 90, 180, 270):
        rotada = base.rotate(-rot, expand=True) if rot else base
        yield "orig", rotada
        yield "thr", _binarizar(rotada)


def extraer_serial_imagen(data: bytes) -> str | None:
    """Detecta el serial en la foto y devuelve el valor en mayúsculas (o None)."""
    try:
        variantes = list(_variantes(data))
    except Exception:
        return None
    for modo, im in variantes:
        for psm in _PSMS:
            try:
                txt = pytesseract.image_to_string(im, config=f"--psm {psm}")
            except Exception:
                continue
            s = _desde_texto(txt)
            if s:
                return s
    return None