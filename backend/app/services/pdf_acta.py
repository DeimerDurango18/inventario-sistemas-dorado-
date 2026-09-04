"""
Generador de PDF para las Actas (Órdenes de Salida / Entrada) de equipos.

Replica el formato físico oficial usado por la compañía:
  - Encabezado con logo, datos de la empresa y consecutivo "SALIDA N° ..."
  - Título "ORDEN DE SALIDA" / "ORDEN DE ENTRADA"
  - Párrafo de autorización
  - Bloque de proyecto / responsable / ciudad / dirección de destino
  - Tabla DISPOSITIVO | MARCA | DETALLE | CANT | SERIAL
  - Observaciones, valor aproximado y número de cajas
  - Marca de agua diagonal con el nombre de la sede (por defecto "SISTEMAS BOGOTA")
  - Pie de firmas (quien entrega / despacho bodega)
"""

from datetime import datetime
from pathlib import Path
import qrcode
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from app.core.config import VERIFY_URL

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm

BLACK = (0, 0, 0)
GRAY_TEXT = (0.25, 0.25, 0.25)
GRAY_LINE = (0.55, 0.55, 0.55)
GRAY_FILL = (0.93, 0.93, 0.93)
WATERMARK_GRAY = (0.55, 0.55, 0.55)


def _fmt_money(value) -> str:
    if value is None:
        return "$ 0"
    try:
        return f"$ {int(round(float(value))):,}".replace(",", ".")
    except (TypeError, ValueError):
        return f"$ {value}"


def _draw_watermark(c: canvas.Canvas, text: str):
    c.saveState()
    try:
        c.setFillAlpha(0.16)
    except Exception:  # pragma: no cover - versiones muy viejas de reportlab
        pass
    c.setFillColorRGB(*WATERMARK_GRAY)
    c.translate(PAGE_W / 2, PAGE_H / 2)
    c.rotate(38)
    c.setFont("Helvetica-Bold", 46)
    c.drawCentredString(0, 0, text.upper())
    c.restoreState()


def _header(c: canvas.Canvas, acta, company: dict, numero: str):
    top = PAGE_H - MARGIN

    # --- QR de Verificación (A la izquierda) ---
    verify_url = f"{VERIFY_URL}/api/reports/actas/{acta.id}/verify"
    qr = qrcode.QRCode(version=1, box_size=10, border=0)
    qr.add_data(verify_url)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white")

    qr_buf = BytesIO()
    img_qr.save(qr_buf, format='PNG')
    qr_buf.seek(0)
    qr_image = ImageReader(qr_buf)

    qr_size = 25 * mm
    qr_x = MARGIN
    qr_y = top - 25 * mm
    c.drawImage(qr_image, qr_x, qr_y, width=qr_size, height=qr_size)
    c.setFont("Helvetica", 6)
    c.drawCentredString(qr_x + qr_size/2, qr_y - 3, "Verificar Acta")

    # --- Logo (desplazado a la derecha del QR) ---
    logo_x, logo_y, logo_w, logo_h = MARGIN + qr_size + 10*mm, top - 24, 46, 24
    logo_path = company.get("logo_path")
    if logo_path and Path(logo_path).exists():
        try:
            c.drawImage(str(logo_path), logo_x, logo_y, width=logo_w, height=logo_h, preserveAspectRatio=True, mask='auto')
        except Exception:
            logo_path = None
    if not (logo_path and Path(logo_path).exists()):
        c.setFillColorRGB(0.1, 0.15, 0.35)
        c.roundRect(logo_x, logo_y, logo_w, logo_h, 4, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(logo_x + logo_w / 2, logo_y + 8, company["nombre"].split()[0][:4].upper())

    # --- Datos de la empresa (a la derecha del logo) ---
    text_x = logo_x + logo_w + 10
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(text_x, top - 8, company["nombre"].upper())
    c.setFont("Helvetica", 7.5)
    c.drawString(text_x, top - 18, f"NIT: {company['nit']}")
    c.drawString(text_x, top - 27, f"TELEFONO: {company['telefono']}")
    c.drawString(text_x, top - 36, company["direccion"].upper())

    # --- Caja "SALIDA N° ..." arriba a la derecha ---
    box_w, box_h = 55 * mm, 15 * mm
    box_x = PAGE_W - MARGIN - box_w
    box_y = top - box_h
    c.setLineWidth(0.8)
    c.setStrokeColorRGB(*BLACK)
    c.rect(box_x, box_y, box_w, box_h, fill=0, stroke=1)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(box_x + box_w / 2, box_y + box_h - 10, f"{acta.tipo} N° {numero}")
    c.setFont("Helvetica", 8.5)
    fecha = acta.created_at or datetime.now()
    c.drawCentredString(box_x + box_w / 2, box_y + 4, fecha.strftime("%Y-%m-%d %H:%M:%S"))

    return top - 46  # y disponible tras el encabezado


def _title(c: canvas.Canvas, y: float, acta):
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 13)
    titulo = "ORDEN DE SALIDA" if acta.tipo == "SALIDA" else "ORDEN DE ENTRADA"
    c.drawCentredString(PAGE_W / 2, y, titulo)
    return y - 18


def _paragraph(c: canvas.Canvas, y: float, acta, company: dict):
    verbo = "el envío" if acta.tipo == "SALIDA" else "la recepción"
    texto = (
        f"Por medio de la presente, se autoriza a {acta.entregado_por.upper()}, {verbo} desde "
        f"{company['nombre'].upper()}. Los Equipos de Trabajo relacionados a Continuación al Siguiente Destino:"
    )
    c.setFont("Helvetica-Bold", 8.5)
    words = texto.split(" ")
    line, lines = "", []
    max_w = PAGE_W - 2 * MARGIN
    for w in words:
        trial = f"{line} {w}".strip()
        if c.stringWidth(trial, "Helvetica-Bold", 8.5) > max_w:
            lines.append(line)
            line = w
        else:
            line = trial
    if line:
        lines.append(line)

    for ln in lines:
        c.drawCentredString(PAGE_W / 2, y, ln)
        y -= 11
    return y - 6


def _info_block(c: canvas.Canvas, y: float, acta):
    c.setFont("Helvetica-Bold", 9)
    left_x = MARGIN + 30
    right_x = PAGE_W / 2 + 20

    c.drawString(left_x, y, (acta.proyecto or "").upper())
    c.drawString(right_x, y, (acta.ciudad_destino or "").upper())
    y -= 11
    c.setFont("Helvetica", 8.5)
    c.drawString(left_x, y, (acta.responsable_destino or "").upper())
    c.drawString(right_x, y, (acta.direccion_destino or "").upper())
    return y - 16


def _fit_text(c: canvas.Canvas, text: str, font: str, size: float, max_w: float) -> str:
    """Recorta el texto con puntos suspensivos si no cabe en el ancho disponible."""
    if c.stringWidth(text, font, size) <= max_w:
        return text
    while text and c.stringWidth(text + "...", font, size) > max_w:
        text = text[:-1]
    return f"{text}..." if text else ""


def _table(c: canvas.Canvas, y: float, items):
    headers = ["DISPOSITIVO", "MARCA", "DETALLE", "CANT", "SERIAL"]
    col_w = [0.20, 0.24, 0.24, 0.08, 0.24]
    total_w = PAGE_W - 2 * MARGIN
    widths = [total_w * f for f in col_w]
    x0 = MARGIN
    row_h = 16

    # Encabezado (fondo negro, texto blanco)
    c.setFillColorRGB(*BLACK)
    c.rect(x0, y - row_h, total_w, row_h, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 8)
    cx = x0
    for h, w in zip(headers, widths):
        if h == "CANT":
            c.drawCentredString(cx + w / 2, y - row_h + 5, h)
        else:
            c.drawString(cx + 4, y - row_h + 5, h)
        cx += w
    y -= row_h

    # Filas
    c.setFont("Helvetica", 7.3)
    for item in items:
        c.setFillColorRGB(*BLACK)
        c.setLineWidth(0.4)
        c.setStrokeColorRGB(*GRAY_LINE)
        c.rect(x0, y - row_h, total_w, row_h, fill=0, stroke=1)
        cx = x0
        values = [
            item.dispositivo or "",
            item.marca or "",
            item.detalle or "",
            str(item.cantidad or 1),
            item.serial or "",
        ]
        for col_index, (val, w) in enumerate(zip(values, widths)):
            c.setFillColorRGB(*BLACK)
            if col_index == 3:  # columna CANT centrada
                c.drawCentredString(cx + w / 2, y - row_h + 5, val)
            else:
                shown = _fit_text(c, val.upper(), "Helvetica", 7.3, w - 8)
                c.drawString(cx + 4, y - row_h + 5, shown)
            cx += w
        y -= row_h

    return y - 8


def _observations(c: canvas.Canvas, y: float, acta):
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN, y, f"OBSERVACIONES: {(acta.observaciones or '').upper()}")
    y -= 14

    # Caja negra "VALOR APROX"
    box_w, box_h = 60 * mm, 12
    c.setFillColorRGB(*BLACK)
    c.rect(MARGIN, y - box_h + 3, box_w, box_h, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN + 4, y - box_h + 7, f"VALOR APROX : {_fmt_money(acta.valor_aprox)}")
    y -= box_h + 6

    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN, y, f"CAJAS       : {acta.cajas or 1}")
    return y - 10


def _footer(c: canvas.Canvas, company: dict, acta, page_label="Pág. 1/1"):
    y = MARGIN + 26
    col_w = (PAGE_W - 2 * MARGIN) / 2

    left_x = MARGIN
    right_x = MARGIN + col_w

    c.setStrokeColorRGB(*BLACK)
    c.setLineWidth(0.6)
    c.line(left_x, y, left_x + col_w - 20, y)
    c.line(right_x + 20, y, right_x + col_w, y)

    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(left_x, y - 11, acta.entregado_por.upper())
    c.drawString(right_x + 20, y - 11, "DESPACHO BODEGA")

    bar_h = 12
    c.setFillColorRGB(*BLACK)
    c.rect(left_x, y - 11 - bar_h - 2, col_w - 20, bar_h, fill=1, stroke=0)
    c.rect(right_x + 20, y - 11 - bar_h - 2, col_w - 20, bar_h, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(left_x + (col_w - 20) / 2, y - 11 - bar_h + 2, company["nombre"].upper())
    c.drawCentredString(
        right_x + 20 + (col_w - 20) / 2,
        y - 11 - bar_h + 2,
        f"BODEGA {(acta.ciudad_destino or company['nombre']).upper()}",
    )

    c.setFillColorRGB(*GRAY_TEXT)
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(PAGE_W / 2, MARGIN - 4, page_label)


def generar_acta_pdf(acta, items, company: dict, output_path: Path) -> Path:
    """Genera el PDF del acta y lo guarda en output_path. Devuelve la ruta final."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output_path), pagesize=A4)

    _draw_watermark(c, company.get("marca_agua") or company["nombre"])

    y = _header(c, acta, company, acta.numero)
    y = _title(c, y, acta)
    y = _paragraph(c, y, acta, company)
    y = _info_block(c, y, acta)
    y = _table(c, y, items)
    y = _observations(c, y, acta)
    _footer(c, company, acta)

    c.showPage()
    c.save()
    return output_path
