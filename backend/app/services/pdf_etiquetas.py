"""Generación de PDF con etiquetas QR imprimibles por equipo (hojas A4)."""
from io import BytesIO
from pathlib import Path

import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from app.core.config import get_public_verify_url

NAME = "SISTEMAS BOGOTA"
LABEL_W, LABEL_H = 80 * mm, 42 * mm  # 2 columnas x 3 filas por hoja
GAP = 6 * mm


def _fit(c: canvas.Canvas, texto: str, font: str, size: float, max_w: float) -> str:
    if c.stringWidth(texto, font, size) <= max_w:
        return texto
    while texto and c.stringWidth(texto + "...", font, size) > max_w:
        texto = texto[:-1]
    return texto + "..." if texto else ""


def _qr_img(payload: str, box_size: int) -> ImageReader:
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=box_size, border=1)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


def _insertar_etiqueta(c: canvas.Canvas, x: float, y: float, fila) -> None:
    folio, marca, modelo, serie, estado, ubicacion, payload = fila
    qr = _qr_img(payload, box_size=8)

    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.setLineWidth(0.5)
    c.roundRect(x, y - LABEL_H, LABEL_W, LABEL_H, 3, stroke=1, fill=0)

    text_w = LABEL_W - 27 * mm - 8  # espacio libre antes del QR

    c.setFillColorRGB(0.05, 0.1, 0.25)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(x + 5, y - 8, _fit(c, folio, "Helvetica-Bold", 13, text_w))
    c.drawImage(qr, x + LABEL_W - 27 * mm, y - 37 * mm, width=27 * mm, height=27 * mm)

    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 5, y - 20, _fit(c, f"{marca} {modelo}".strip(), "Helvetica-Bold", 9, text_w))
    c.setFont("Helvetica", 8)
    c.drawString(x + 5, y - 30, _fit(c, f"SERIE: {serie or 'N/D'}", "Helvetica", 8, text_w))
    c.drawString(x + 5, y - 38, _fit(c, f"ESTADO: {estado.upper()}", "Helvetica", 8, text_w))
    c.drawString(x + 5, y - 46, _fit(c, f"UBIC.: {ubicacion or '—'}", "Helvetica", 8, text_w))

    c.setFont("Helvetica-Oblique", 6.5)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(x + 5, y - LABEL_H + 5, NAME)


def generar_etiquetas_pdf(equipos, output_path: Path) -> Path:
    """Genera el PDF de etiquetas; equipos: lista de dicts con datos del equipo."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output_path), pagesize=A4)
    page_w, page_h = A4

    margen = 10 * mm
    col_w = LABEL_W + GAP
    row_h = LABEL_H + GAP

    for i, eq in enumerate(equipos):
        if i % 6 == 0:
            if i > 0:
                c.showPage()
            c.setFillColorRGB(*[(0.1, 0.1, 0.1)][0])
            c.setFont("Helvetica-Bold", 12)
            c.drawString(margen, page_h - 8 * mm, f"EQUIPOS · HOJA {i // 6 + 1}")

        col = i % 2
        row = (i % 6) // 2
        x = margen + col * col_w
        y = page_h - 12 * mm - row * row_h

        payload = f"{get_public_verify_url()}/consulta/equipos/{eq.get('id') or ''}"
        _insertar_etiqueta(
            c, x, y,
            (
                eq.get("folio") or "",
                eq.get("marca") or "",
                eq.get("modelo") or "",
                eq.get("serie") or "",
                eq.get("estado") or "",
                eq.get("ubicacion") or "",
                payload,
            ),
        )

    c.save()
    return output_path