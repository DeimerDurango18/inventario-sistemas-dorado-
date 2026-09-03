"""Generador de PDF para el Acta de Mantenimiento de equipos.

Replica el estilo corporativo de las actas (misma marca de agua, logo y pie),
pero orientado a servicios de mantenimiento:
  - Encabezado con datos de la empresa y consecutivo "MANTENIMIENTO N° #"
  - Título e identificación del equipo
  - Datos del servicio: tipo, técnico, descripción, costo, fecha
  - Historial de movimientos del equipo si se dispone de él
  - Firma del técnico / responsable
"""

from datetime import datetime, timezone
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm

BLACK = (0, 0, 0)
WHITE = (1, 1, 1)
GRAY_TEXT = (0.25, 0.25, 0.25)
GRAY_LINE = (0.55, 0.55, 0.55)
BLUE = (0.1, 0.15, 0.35)
WATERMARK_GRAY = (0.62, 0.62, 0.62)


def _fmt_fecha(value) -> str:
    if value is None:
        return "-"
    if isinstance(value, str):
        return value
    return value.strftime("%Y-%m-%d %H:%M")


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
        c.setFillAlpha(0.14)
    except Exception:  # pragma: no cover
        pass
    c.setFillColorRGB(*WATERMARK_GRAY)
    c.translate(PAGE_W / 2, PAGE_H / 2)
    c.rotate(38)
    c.setFont("Helvetica-Bold", 44)
    c.drawCentredString(0, 0, text.upper())
    c.restoreState()


def _header(c: canvas.Canvas, company: dict, numero: str):
    top = PAGE_H - MARGIN

    logo_x, logo_y, logo_w, logo_h = MARGIN, top - 24, 46, 24
    c.setFillColorRGB(*BLUE)
    c.roundRect(logo_x, logo_y, logo_w, logo_h, 4, fill=1, stroke=0)
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(logo_x + logo_w / 2, logo_y + 8, company["nombre"].split()[0][:4].upper())

    text_x = logo_x + logo_w + 10
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(text_x, top - 8, company["nombre"].upper())
    c.setFont("Helvetica", 7.5)
    c.drawString(text_x, top - 18, f"NIT: {company['nit']}")
    c.drawString(text_x, top - 27, f"TELEFONO: {company['telefono']}")
    c.drawString(text_x, top - 36, company["direccion"].upper())

    box_w, box_h = 60 * mm, 15 * mm
    box_x = PAGE_W - MARGIN - box_w
    box_y = top - box_h
    c.setLineWidth(0.8)
    c.setStrokeColorRGB(*BLACK)
    c.rect(box_x, box_y, box_w, box_h, fill=0, stroke=1)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(box_x + box_w / 2, box_y + box_h - 10, f"MANTENIMIENTO N° {numero}")
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(box_x + box_w / 2, box_y + 4, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    return top - 48


def _title(c: canvas.Canvas, y: float):
    c.setFillColorRGB(*BLACK)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(PAGE_W / 2, y, "ACTA DE MANTENIMIENTO")
    return y - 22


def _label_row(c: canvas.Canvas, y: float, label: str, value: str):
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(*BLACK)
    c.drawString(MARGIN, y, label.upper())
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(*GRAY_TEXT)
    c.drawString(MARGIN + 130, y, value)
    return y - 15


def _section(c: canvas.Canvas, y: float, title: str):
    c.setFillColorRGB(*BLUE)
    c.rect(MARGIN, y - 20, PAGE_W - 2 * MARGIN, 20, fill=1, stroke=0)
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(MARGIN + 6, y - 13, title.upper())
    return y - 32


def _movements_table(c: canvas.Canvas, y: float, movimientos):
    headers = ["FECHA", "TIPO", "MOTIVO", "RESPONSABLE"]
    col_w = [0.16, 0.18, 0.40, 0.26]
    total_w = PAGE_W - 2 * MARGIN
    widths = [total_w * f for f in col_w]
    x0 = MARGIN
    row_h = 16

    if movimientos:
        c.setFillColorRGB(*BLACK)
        c.rect(x0, y - row_h, total_w, row_h, fill=1, stroke=0)
        c.setFillColorRGB(*WHITE)
        c.setFont("Helvetica-Bold", 8)
        cx = x0
        for h, w in zip(headers, widths):
            c.drawString(cx + 4, y - row_h + 5, h)
            cx += w
        y -= row_h

        c.setFont("Helvetica", 7.5)
        for m in movimientos[:8]:
            c.setStrokeColorRGB(*GRAY_LINE)
            c.rect(x0, y - row_h, total_w, row_h, fill=0, stroke=1)
            cx = x0
            values = [
                _fmt_fecha(m.created_at),
                (m.tipo or ""),
                (m.motivo or "")[:60],
                (m.persona or "")[:30],
            ]
            for val, w in zip(values, widths):
                txt = val.upper()
                while c.stringWidth(txt, "Helvetica", 7.5) > w - 8 and txt:
                    txt = txt[:-1]
                c.setFillColorRGB(*BLACK)
                c.drawString(cx + 4, y - row_h + 5, txt)
                cx += w
            y -= row_h
    else:
        c.setFont("Helvetica", 9)
        c.drawString(x0, y - 12, "Sin movimientos registrados para este equipo.")
        y -= 16
    return y - 8


def _final_account(c: canvas.Canvas, y: float, registro, equipo):
    c.setStrokeColorRGB(*BLACK)
    c.setLineWidth(0.6)
    c.line(MARGIN, y, PAGE_W - MARGIN, y)
    y -= 14

    col_w = (PAGE_W - 2 * MARGIN) / 3
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(MARGIN, y, "TIPO DE SERVICIO")
    c.drawString(MARGIN + col_w, y, "ESTADO")
    c.drawString(MARGIN + 2 * col_w, y, "COSTO")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(*BLUE)
    c.drawString(MARGIN, y - 13, (registro.tipo or "-").upper())
    c.drawString(MARGIN + col_w, y - 13, (registro.estado or "-").upper())
    c.drawString(MARGIN + 2 * col_w, y - 13, _fmt_money(registro.costo))
    c.setFillColorRGB(*BLACK)
    return y - 40


def generar_acta_mantenimiento_pdf(
    registro,
    equipo,
    company: dict,
    output_path: Path,
    movimientos=None,
) -> Path:
    """Genera el PDF de mantenimiento y lo guarda en output_path."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output_path), pagesize=A4)
    _draw_watermark(c, company.get("marca_agua") or company["nombre"])

    numero = f"MT-{registro.id}"
    y = _header(c, company, numero)
    y = _title(c, y)

    y = _section(c, y, "Identificación del equipo")
    folio = equipo.folio if equipo else "-"
    desc = f"{equipo.marca} {equipo.modelo}" if equipo else "-"
    y = _label_row(c, y, "FOLIO", folio)
    y = _label_row(c, y, "EQUIPO", desc)
    y = _label_row(c, y, "SERIE", (equipo.serie or "-") if equipo else "-")
    y = _label_row(c, y, "UBICACIÓN", ((equipo.ubicacion_rel.nombre if equipo and equipo.ubicacion_rel else (equipo.ubicacion if equipo else "")) or "-"))

    y = _section(c, y, "Datos del servicio")
    y = _label_row(c, y, "TÉCNICO", (registro.tecnico or "-").upper())
    y = _label_row(c, y, "DESCRIPCIÓN", (registro.descripcion or "-"))
    y = _label_row(c, y, "FECHA PROGRAMADA", _fmt_fecha(registro.fecha_programada))

    y = _section(c, y, "Historial del equipo")
    y = _movements_table(c, y, movimientos or [])

    y = _final_account(c, y, registro, equipo)

    # Firmas
    firma_y = MARGIN + 34
    col_w = (PAGE_W - 2 * MARGIN) / 2
    c.setStrokeColorRGB(*BLACK)
    c.setLineWidth(0.6)
    c.line(MARGIN, firma_y, MARGIN + col_w - 20, firma_y)
    c.line(MARGIN + col_w + 20, firma_y, PAGE_W - MARGIN, firma_y)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(MARGIN, firma_y - 12, (registro.tecnico or "TÉCNICO").upper())
    c.drawString(MARGIN + col_w + 20, firma_y - 12, "RESPONSABLE / BODEGA")

    c.setFillColorRGB(*GRAY_TEXT)
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(PAGE_W / 2, MARGIN - 4, "Pág. 1/1")

    c.showPage()
    c.save()
    return output_path