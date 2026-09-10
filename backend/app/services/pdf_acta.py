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
import json
import qrcode
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from app.core.config import get_public_verify_url

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
    verify_url = f"{get_public_verify_url()}/api/reports/actas/{acta.id}/verify"
    qr = qrcode.QRCode(version=1, box_size=10, border=0)
    qr.add_data(verify_url)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white")

    qr_buf = BytesIO()
    img_qr.save(qr_buf, format='PNG')
    qr_buf.seek(0)
    qr_image = ImageReader(qr_buf)

    qr_size = 22 * mm
    qr_x = MARGIN
    qr_y = top - qr_size
    c.drawImage(qr_image, qr_x, qr_y, width=qr_size, height=qr_size)
    c.setFont("Helvetica", 6)
    c.drawCentredString(qr_x + qr_size/2, qr_y - 4, "Verificar Acta")

    # --- Logo (desplazado a la derecha del QR) ---
    logo_x, logo_y, logo_w, logo_h = MARGIN + qr_size + 8*mm, top - 22, 44, 22
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
    c.drawString(text_x, top - 19, f"NIT: {company['nit']}")
    c.drawString(text_x, top - 30, f"TELEFONO: {company['telefono']}")
    c.drawString(text_x, top - 41, company["direccion"].upper())

    # --- Caja "SALIDA N° ..." arriba a la derecha ---
    box_w, box_h = 55 * mm, 18 * mm
    box_x = PAGE_W - MARGIN - box_w
    box_y = top - box_h - 4
    c.setLineWidth(0.8)
    c.setStrokeColorRGB(*BLACK)
    c.rect(box_x, box_y, box_w, box_h, fill=0, stroke=1)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(box_x + box_w / 2, box_y + box_h - 12, f"{acta.tipo} N° {numero}")
    c.setFont("Helvetica", 8.5)
    fecha = acta.created_at or datetime.now()
    c.drawCentredString(box_x + box_w / 2, box_y + 4, fecha.strftime("%Y-%m-%d %H:%M:%S"))

    return top - qr_size - 10  # y disponible tras el encabezado


def _title(c: canvas.Canvas, y: float, acta):
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 13)
    titulo = "ORDEN DE SALIDA" if acta.tipo == "SALIDA" else "ORDEN DE ENTRADA"
    c.drawCentredString(PAGE_W / 2, y, titulo)
    return y - 24


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
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, y, "PROYECTO:")
    c.drawString(PAGE_W / 2 + 20, y, "CIUDAD DESTINO:")
    y -= 13

    c.setFont("Helvetica", 8.5)
    c.setFillColorRGB(*GRAY_TEXT)
    proy = _fit_text(c, (acta.proyecto or "-").upper(), "Helvetica", 8.5, (PAGE_W / 2) - MARGIN - 90)
    c.drawString(MARGIN, y, proy)
    c.drawString(PAGE_W / 2 + 20, y, _fit_text(c, (acta.ciudad_destino or "-").upper(), "Helvetica", 8.5, (PAGE_W / 2) - MARGIN - 90))
    y -= 15

    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(*BLACK)
    c.drawString(MARGIN, y, "RESPONSABLE DESTINO:")
    c.drawString(PAGE_W / 2 + 20, y, "DIRECCIÓN DESTINO:")
    y -= 13

    c.setFont("Helvetica", 8.5)
    c.setFillColorRGB(*GRAY_TEXT)
    resp = _fit_text(c, (acta.responsable_destino or "-").upper(), "Helvetica", 8.5, (PAGE_W / 2) - MARGIN - 90)
    dir_ = _fit_text(c, (acta.direccion_destino or "-").upper(), "Helvetica", 8.5, (PAGE_W / 2) - MARGIN - 90)
    c.drawString(MARGIN, y, resp)
    c.drawString(PAGE_W / 2 + 20, y, dir_)
    return y - 22


def _fit_text(c: canvas.Canvas, text: str, font: str, size: float, max_w: float) -> str:
    """Recorta el texto con puntos suspensivos si no cabe en el ancho disponible."""
    if c.stringWidth(text, font, size) <= max_w:
        return text
    while text and c.stringWidth(text + "...", font, size) > max_w:
        text = text[:-1]
    return f"{text}..." if text else ""


def _wrap_text(c: canvas.Canvas, text: str, font: str, size: float, max_w: float, max_lines: int = None) -> list:
    """Divide el texto en líneas que caben en max_w; opcionalmente recorta el total a max_lines."""
    words = text.split()
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
        last = _fit_text(c, f"{out[max_lines - 1]} ...", font, size, max_w)
        out = kept + [last]
    return out


def _continuation_header(c: canvas.Canvas, label: str):
    """Encabezado ligero de las páginas de continuación del acta."""
    y = PAGE_H - MARGIN
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, y - 10, label)
    c.setStrokeColorRGB(*GRAY_LINE)
    c.setLineWidth(0.6)
    c.line(MARGIN, y - 18, PAGE_W - MARGIN, y - 18)
    return y - 30


def _table(c: canvas.Canvas, y: float, items, marca_agua: str, acta):
    headers = ["DISPOSITIVO", "MARCA", "DETALLE", "CANT", "SERIAL"]
    col_w = [0.20, 0.24, 0.24, 0.08, 0.24]
    total_w = PAGE_W - 2 * MARGIN
    widths = [total_w * f for f in col_w]
    x0 = MARGIN
    row_h = 16
    floor = 170  # no dibujar filas por debajo de la zona de observaciones/firmas

    def _draw_header(y):
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
        return y - row_h

    y = _draw_header(y)

    c.setFont("Helvetica", 7.3)
    for item in items:
        if y - row_h < floor:
            c.showPage()
            _draw_watermark(c, marca_agua)
            y = _continuation_header(c, f"{acta.tipo} N° {acta.numero} — CONTINUACIÓN")
            y = _draw_header(y)

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


def _observations(c: canvas.Canvas, y: float, acta, marca_agua: str):
    # Si no queda espacio para las observaciones + bloque de valores, abrir página nueva.
    if y - 90 < MARGIN + 90:
        c.showPage()
        _draw_watermark(c, marca_agua)
        y = _continuation_header(c, f"{acta.tipo} N° {acta.numero} — CONTINUACIÓN")

    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 8)
    max_w = PAGE_W - 2 * MARGIN
    lines = _wrap_text(c, f"OBSERVACIONES: {(acta.observaciones or '').upper()}", "Helvetica-Bold", 8, max_w, max_lines=3)
    for ln in lines:
        c.drawString(MARGIN, y, ln)
        y -= 12
    y -= 6

    # Caja negra "VALOR APROX"
    box_w, box_h = 60 * mm, 12
    c.setFillColorRGB(*BLACK)
    c.rect(MARGIN, y - box_h + 3, box_w, box_h, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN + 4, y - box_h + 7, f"VALOR APROX : {_fmt_money(acta.valor_aprox)}")
    y -= box_h + 8

    # Caja negra "CAJAS"
    c.setFillColorRGB(*BLACK)
    c.rect(MARGIN, y - box_h + 3, box_w, box_h, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN + 4, y - box_h + 7, f"CAJAS       : {acta.cajas or 1}")
    y -= box_h + 10
    return y


def _fotos(c: canvas.Canvas, y: float, fotos: list, marca_agua: str, acta):
    """Dibuja las fotos de evidencia en una fila (máx. 3). Devuelve la nueva y."""
    if not fotos:
        return y

    base = Path(__file__).resolve().parents[3] / "storage"
    imgs = []
    for ruta in fotos:
        p = base / str(ruta).lstrip("/")
        if p.exists():
            try:
                imgs.append(str(p))
            except Exception:
                continue
    if not imgs:
        return y

    thumb_w = 46 * mm
    thumb_h = 34 * mm
    label_h = 6 * mm
    gap = 5 * mm
    total_h = label_h + thumb_h + 6

    # Si no queda espacio para las fotos + observaciones, abrir página nueva.
    if y - total_h < 175:
        c.showPage()
        _draw_watermark(c, marca_agua)
        y = _continuation_header(c, f"{acta.tipo} N° {acta.numero} — ANEXO FOTOGRÁFICO")

    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN, y, "EVIDENCIA FOTOGRÁFICA:")
    y -= label_h + 4

    n = min(3, len(imgs))
    total_w = n * thumb_w + (n - 1) * gap
    x0 = (PAGE_W - total_w) / 2
    for i in range(n):
        try:
            c.drawImage(imgs[i], x0, y - thumb_h, width=thumb_w, height=thumb_h, preserveAspectRatio=True, mask="auto")
        except Exception:
            c.setStrokeColorRGB(*GRAY_LINE)
            c.rect(x0, y - thumb_h, thumb_w, thumb_h, fill=0, stroke=1)
            c.setFont("Helvetica", 6.5)
            c.drawCentredString(x0 + thumb_w / 2, y - thumb_h / 2, "FOTO")
        x0 += thumb_w + gap

    return y - thumb_h - 6


def _recibido_conforme(c: canvas.Canvas, acta, y: float = None):
    """Constancia de la firma del responsable del destino (se imprime bajo la tabla)."""
    y = y if y is not None else MARGIN + 58
    col_w = PAGE_W - 2 * MARGIN

    c.setStrokeColorRGB(*BLACK)
    c.setLineWidth(0.6)
    c.line(MARGIN + col_w / 4, y, MARGIN + 3 * col_w / 4 - 30, y)

    c.setFont("Helvetica-Bold", 8)
    c.setFillColorRGB(*BLACK)
    c.drawCentredString(PAGE_W / 2 - 15, y + 6, "RECIBIDO CONFORME POR EL RESPONSABLE DEL DESTINO")

    c.setFont("Helvetica-Bold", 8.5)
    c.drawCentredString(PAGE_W / 2 - 15, y - 12, acta.firmado_por or "")

    c.setFont("Helvetica", 7.5)
    c.setFillColorRGB(*GRAY_TEXT)
    c.drawCentredString(PAGE_W / 2 - 15, y - 23, f"C.C./DOC.: {acta.documento_firma or '—'}")
    if acta.fecha_firma:
        c.drawCentredString(PAGE_W / 2 - 15, y - 33, f"FECHA: {acta.fecha_firma.strftime('%Y-%m-%d %H:%M')}")


def _footer(c: canvas.Canvas, company: dict, acta, page_label="Pág. 1"):
    y = MARGIN + 26
    col_w = (PAGE_W - 2 * MARGIN) / 2

    left_x = MARGIN
    right_x = MARGIN + col_w

    c.setStrokeColorRGB(*BLACK)
    c.setLineWidth(0.6)
    c.line(left_x, y, left_x + col_w - 20, y)
    c.line(right_x + 20, y, right_x + col_w, y)

    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(left_x, y - 11, _fit_text(c, acta.entregado_por.upper(), "Helvetica-Bold", 8.5, col_w - 24))
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
    marca = company.get("marca_agua") or company["nombre"]

    _draw_watermark(c, marca)

    y = _header(c, acta, company, acta.numero)
    y = _title(c, y, acta)
    y = _paragraph(c, y, acta, company)
    y = _info_block(c, y, acta)
    y = _table(c, y, items, marca, acta)

    # Si no queda espacio para observaciones + firmas, abrir una última página
    if y < 170:
        c.showPage()
        _draw_watermark(c, marca)
        y = _continuation_header(c, f"{acta.tipo} N° {acta.numero} — CONTINUACIÓN")

    try:
        fotos = json.loads(acta.fotos) if acta.fotos else []
    except (ValueError, TypeError):
        fotos = []
    y = _fotos(c, y, fotos, marca, acta)

    y = _observations(c, y, acta, marca)
    # Si el bloque de valores bajó demasiado, abrir página para recibido/firmas
    if y < MARGIN + 110:
        c.showPage()
        _draw_watermark(c, marca)
        y = _continuation_header(c, f"{acta.tipo} N° {acta.numero} — CONTINUACIÓN")
    if acta.firmado_por:
        _recibido_conforme(c, acta, y=y)
    _footer(c, company, acta, f"Pág. {c.getPageNumber()}")

    c.showPage()
    c.save()
    return output_path
