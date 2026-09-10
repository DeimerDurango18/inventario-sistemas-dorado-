"""Generador de PDF del Acta de Mantenimiento grupal.

Para el flujo de farmacia: se registran todos los equipos revisados en una
visita, tomando el serial de cada uno y especificando el nombre del equipo.
"""

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

import qrcode
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from app.core.config import get_public_verify_url

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm

BLACK = (0.1, 0.1, 0.15)
WHITE = (1, 1, 1)
GRAY_TEXT = (0.25, 0.25, 0.25)
GRAY_LINE = (0.75, 0.75, 0.75)
BLUE = (0.1, 0.15, 0.35)


def _fmt_fecha(value) -> str:
    if value is None:
        return "-"
    if isinstance(value, str):
        return value
    try:
        return value.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return str(value)


def _fit(c: canvas.Canvas, texto: str, font: str, size: float, max_w: float) -> str:
    t = texto.upper()
    if c.stringWidth(t, font, size) <= max_w:
        return t
    while t and c.stringWidth(t + "...", font, size) > max_w:
        t = t[:-1]
    return t + "..." if t else ""


def _wrap(c: canvas.Canvas, texto: str, font: str, size: float, max_w: float, max_lines: int = None) -> list:
    words = texto.split()
    out, cur = [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if c.stringWidth(trial, font, size) > max_w:
            if cur:
                out.append(cur)
            cur = w
        else:
            cur = trial
    if cur:
        out.append(cur)
    if max_lines is not None and len(out) > max_lines:
        kept = out[: max_lines - 1]
        last = _fit(c, f"{out[max_lines - 1]} ...", font, size, max_w)
        out = kept + [last]
    return out


def _continuation(c: canvas.Canvas, marca: str, label: str):
    c.showPage()
    _draw_watermark(c, marca)
    y = PAGE_H - MARGIN
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, y - 10, label)
    c.setStrokeColorRGB(*GRAY_LINE)
    c.setLineWidth(0.6)
    c.line(MARGIN, y - 18, PAGE_W - MARGIN, y - 18)
    return y - 30


def _draw_watermark(c: canvas.Canvas, text: str):
    c.saveState()
    try:
        c.setFillAlpha(0.14)
    except Exception:
        pass
    c.setFillColorRGB(0.6, 0.6, 0.6)
    c.translate(PAGE_W / 2, PAGE_H / 2)
    c.rotate(38)
    c.setFont("Helvetica-Bold", 44)
    c.drawCentredString(0, 0, text.upper())
    c.restoreState()


def _header(c: canvas.Canvas, company: dict, numero: str, acta_id: int):
    top = PAGE_H - MARGIN
    qr_size = 22 * mm
    if acta_id:
        verify_url = f"{get_public_verify_url()}/api/actas-mantenimiento/{acta_id}/verify"
        qr = qrcode.QRCode(version=1, box_size=10, border=0)
        qr.add_data(verify_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        qr_img = ImageReader(buf)
        c.drawImage(qr_img, MARGIN, top - qr_size, width=qr_size, height=qr_size)
        c.setFont("Helvetica", 6)
        c.drawCentredString(MARGIN + qr_size / 2, top - qr_size - 4, "Verificar Acta")

    qr_offset = (qr_size + 8 * mm) if acta_id else 0
    logo_x, logo_y, logo_w, logo_h = MARGIN + qr_offset, top - 22, 44, 22
    logo_path = company.get("logo_path")
    if logo_path and Path(logo_path).exists():
        c.drawImage(str(logo_path), logo_x, logo_y, width=logo_w, height=logo_h, preserveAspectRatio=True, mask="auto")

    text_x = logo_x + logo_w + 10
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(text_x, top - 8, company["nombre"].upper())
    c.setFont("Helvetica", 7.5)
    c.drawString(text_x, top - 19, f"NIT: {company['nit']}")
    c.drawString(text_x, top - 30, f"TELEFONO: {company['telefono']}")
    c.drawString(text_x, top - 41, company["direccion"].upper())

    box_w, box_h = 62 * mm, 18 * mm
    box_x = PAGE_W - MARGIN - box_w
    box_y = top - box_h - 4
    c.setLineWidth(0.8)
    c.setStrokeColorRGB(*BLACK)
    c.rect(box_x, box_y, box_w, box_h, fill=0, stroke=1)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(box_x + box_w / 2, box_y + box_h - 12, f"MANTENIMIENTO N° {numero}")
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(box_x + box_w / 2, box_y + 4, _fmt_fecha(datetime.now()))
    return top - qr_size - 10


def _title(c: canvas.Canvas, y: float):
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(PAGE_W / 2, y, "ACTA DE MANTENIMIENTO DE EQUIPOS")
    return y - 26


def _section_bar(c: canvas.Canvas, y: float, title: str):
    c.setFillColorRGB(*BLUE)
    c.rect(MARGIN, y - 20, PAGE_W - 2 * MARGIN, 20, fill=1, stroke=0)
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(MARGIN + 6, y - 13, title.upper())
    return y - 36


def _label_row(c: canvas.Canvas, y: float, label: str, value: str):
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(*BLACK)
    c.drawString(MARGIN + 4, y, label.upper())
    label_w = c.stringWidth(label.upper(), "Helvetica-Bold", 9)
    value_x = MARGIN + 4 + label_w + 12
    max_w = PAGE_W - MARGIN - value_x - 4
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(*GRAY_TEXT)
    c.drawString(value_x, y, _fit(c, value or "-", "Helvetica", 9, max_w))
    return y - 18


def _equipos_table(c: canvas.Canvas, y: float, items, marca: str, numero: str):
    """Dibuja la tabla de equipos revisados: N° | EQUIPO | SERIAL, con paginación."""
    headers = ["N°", "NOMBRE DEL EQUIPO", "SERIAL"]
    col_frac = [0.06, 0.56, 0.38]
    total_w = PAGE_W - 2 * MARGIN
    widths = [total_w * f for f in col_frac]
    row_h = 16
    x0 = MARGIN
    floor = MARGIN + 110  # no bajar más allá de la zona de resumen/firmas

    def _draw_header(y):
        c.setFillColorRGB(*BLACK)
        c.rect(x0, y - row_h, total_w, row_h, fill=1, stroke=0)
        c.setFillColorRGB(*WHITE)
        c.setFont("Helvetica-Bold", 8)
        cx = x0
        for h, w in zip(headers, widths):
            c.drawCentredString(cx + w / 2, y - row_h + 5, h)
            cx += w
        return y - row_h

    y = _draw_header(y)

    c.setFont("Helvetica", 8)
    for idx, it in enumerate(items, start=1):
        if y - row_h < floor:
            y = _continuation(c, marca, f"MANTENIMIENTO N° {numero} — CONTINUACIÓN")
            y = _draw_header(y)
        c.setStrokeColorRGB(*GRAY_LINE)
        c.rect(x0, y - row_h, total_w, row_h, fill=0, stroke=1)
        cx = x0
        values = [str(idx), _fit(c, it.nombre_equipo or "-", "Helvetica-Bold", 8, widths[1] - 8), _fit(c, it.serie or "S/N", "Helvetica", 8, widths[2] - 8)]
        for j, (val, w) in enumerate(zip(values, widths)):
            c.setFillColorRGB(*BLACK)
            c.setFont("Helvetica-Bold", 8) if j == 1 else c.setFont("Helvetica", 8)
            c.drawString(cx + 4, y - row_h + 5, val)
            cx += w
        y -= row_h
    return y - 10


def _final(c: canvas.Canvas, y: float, acta, marca: str, numero: str):
    if y < MARGIN + 90:
        y = _continuation(c, marca, f"MANTENIMIENTO N° {numero} — CONTINUACIÓN")

    # Observaciones (con salto de línea)
    obs = (acta.observaciones or "").strip().upper()
    if obs:
        c.setFont("Helvetica-Bold", 8)
        c.setFillColorRGB(*BLACK)
        max_w = PAGE_W - 2 * MARGIN
        for ln in _wrap(c, f"OBSERVACIONES: {obs}", "Helvetica-Bold", 8, max_w, max_lines=3):
            c.drawString(MARGIN, y, ln)
            y -= 11
        y -= 4
    else:
        y -= 22

    # Totales / resumen
    c.setStrokeColorRGB(*BLACK)
    c.setLineWidth(0.6)
    c.line(MARGIN, y, PAGE_W - MARGIN, y)
    y -= 16
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(*BLACK)
    c.drawString(MARGIN, y, f"TECNICO: {(acta.tecnico or '-').upper()}")
    c.setFillColorRGB(*BLUE)
    c.drawRightString(PAGE_W - MARGIN, y, f"PRIORIDAD: {(acta.prioridad or 'media').upper()}")
    y -= 30

    # Firmas
    if y < MARGIN + 60:
        y = _continuation(c, marca, f"MANTENIMIENTO N° {numero} — CONTINUACIÓN")
    firma_y = max(y, MARGIN + 50)
    col_half = (PAGE_W - 2 * MARGIN) / 2
    c.setStrokeColorRGB(*BLACK)
    c.setLineWidth(0.6)
    c.line(MARGIN, firma_y, MARGIN + col_half - 20, firma_y)
    c.line(MARGIN + col_half + 20, firma_y, PAGE_W - MARGIN, firma_y)
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColorRGB(*BLACK)
    c.drawString(MARGIN, firma_y - 12, _fit(c, acta.tecnico or "TECNICO", "Helvetica-Bold", 8.5, col_half - 24))
    c.drawString(MARGIN + col_half + 20, firma_y - 12, "RESPONSABLE / CLIENTE")

    c.setFillColorRGB(*GRAY_TEXT)
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(PAGE_W / 2, MARGIN - 4, f"Pág. {c.getPageNumber()}")


def generar_acta_mantenimiento_grupal_pdf(
    acta,
    items,
    company: dict,
    output_path: Path,
) -> Path:
    """Genera el PDF del acta de mantenimiento grupal y lo guarda en output_path."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output_path), pagesize=A4)
    marca = company.get("marca_agua") or company["nombre"]
    _draw_watermark(c, marca)

    numero = f"MTG-{acta.id}"
    y = _header(c, company, numero, acta.id)
    y = _title(c, y)
    y = _section_bar(c, y, "Informacion del servicio")
    y = _label_row(c, y, "CLIENTE", acta.cliente or "-")
    y = _label_row(c, y, "FECHA", _fmt_fecha(acta.fecha))
    y = _label_row(c, y, "TECNICO", acta.tecnico or "-")
    y = _label_row(c, y, "EQUIPOS", f"{len(items)}")

    y = _section_bar(c, y, "Equipos revisados")
    y = _equipos_table(c, y, items, marca, numero)

    _final(c, y, acta, marca, numero)

    c.showPage()
    c.save()
    return output_path