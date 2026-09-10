"""Generador de reportes PDF (FASE 6): inventario por ubicación y resumen de mantenimientos.

Reutiliza el encabezado corporativo de las actas (logo real de la compañía si está
disponible) y aplica estilo consistente: título, tablas, marca de agua y pie de página.
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


def _header(c: canvas.Canvas, company: dict, titulo: str):
    top = PAGE_H - MARGIN

    logo_x, logo_y, logo_w, logo_h = MARGIN, top - 24, 46, 24
    logo_path = company.get("logo_path")
    if logo_path and Path(logo_path).exists():
        try:
            c.drawImage(
                str(logo_path), logo_x, logo_y, width=logo_w, height=logo_h,
                preserveAspectRatio=True, mask="auto",
            )
        except Exception:
            logo_path = None
    if not (logo_path and Path(logo_path).exists()):
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
    c.drawString(text_x, top - 19, f"NIT: {company['nit']}")
    c.drawString(text_x, top - 30, f"TELEFONO: {company['telefono']}")
    c.drawString(text_x, top - 41, company["direccion"].upper())

    c.setFont("Helvetica-Bold", 12)
    c.setFillColorRGB(*BLUE)
    c.drawCentredString(PAGE_W / 2, top - 60, titulo.upper())
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(*GRAY_TEXT)
    c.drawCentredString(
        PAGE_W / 2, top - 72,
        f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
    )
    return top - 88


def _table_header(c: canvas.Canvas, y: float, headers, widths, row_h=16):
    total_w = PAGE_W - 2 * MARGIN
    x0 = MARGIN
    colxs = []
    cx = x0
    for w in widths:
        colxs.append(cx)
        cx = cx + w
    c.setFillColorRGB(*BLUE)
    c.rect(x0, y - row_h, total_w, row_h, fill=1, stroke=0)
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica-Bold", 8)
    for h, xs, w in zip(headers, colxs, widths):
        c.drawString(xs + 4, y - row_h + 5, h.upper())
    return y - row_h, colxs


def _footer(c: canvas.Canvas, page: int):
    c.setFillColorRGB(*GRAY_TEXT)
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(PAGE_W / 2, MARGIN - 4, f"Pág. {page}")


def _table_row(c: canvas.Canvas, y: float, values, colxs, widths, row_h=16) -> float:
    c.setStrokeColorRGB(*GRAY_LINE)
    total_w = PAGE_W - 2 * MARGIN
    c.rect(MARGIN, y - row_h, total_w, row_h, fill=0, stroke=1)
    c.setFont("Helvetica", 7.5)
    for val, xs, w in zip(values, colxs, widths):
        txt = str(val)
        if txt == "-" or not txt:
            txt = "-"
        txt = txt.upper()
        while c.stringWidth(txt, "Helvetica", 7.5) > w - 8 and txt:
            txt = txt[:-1]
        c.drawString(xs + 4, y - row_h + 5, txt)
    return y - row_h


def generar_inventario_por_ubicacion(
    por_ubicacion,
    total_equipos: int,
    valor_total: float | None,
    company: dict,
    output_path: Path,
) -> Path:
    """Reporte en PDF del inventario agrupado por ubicación."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output_path), pagesize=A4)
    _draw_watermark(c, company.get("marca_agua") or company["nombre"])

    y = _header(c, company, "INVENTARIO POR UBICACIÓN")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(*BLACK)
    c.drawString(MARGIN, y, f"TOTAL DE EQUIPOS: {total_equipos}")
    c.drawRightString(PAGE_W - MARGIN, y, f"VALOR TOTAL: {_fmt_money(valor_total)}")
    y -= 24

    headers = ["UBICACIÓN", "CANTIDAD", "VALOR TOTAL"]
    widths = [0.45, 0.25, 0.30]
    total_w = PAGE_W - 2 * MARGIN
    widths = [total_w * f for f in widths]
    y, colxs = _table_header(c, y, headers, widths, row_h=18)
    y -= 2

    page = 1
    if not por_ubicacion:
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN, y - 12, "Sin equipos registrados.")
        y -= 20

    c.setFont("Helvetica", 7.5)
    for fila in por_ubicacion:
        if y < MARGIN + 40:
            _footer(c, page)
            c.showPage()
            page += 1
            _draw_watermark(c, company.get("marca_agua") or company["nombre"])
            y = _header(c, company, "INVENTARIO POR UBICACIÓN")
            c.setFont("Helvetica-Bold", 9)
            c.drawString(MARGIN, y, f"TOTAL DE EQUIPOS: {total_equipos}")
            c.drawRightString(PAGE_W - MARGIN, y, f"VALOR TOTAL: {_fmt_money(valor_total)}")
            y -= 24
            y, colxs = _table_header(c, y, headers, widths, row_h=18)
            y -= 2
            c.setFont("Helvetica", 7.5)

        nombre = fila.get("ubicacion") or fila.get("nombre") or "-"
        cant = fila.get("cantidad") or fila.get("cant") or 0
        valor = fila.get("valor_total") or fila.get("valor") or 0
        y = _table_row(c, y, [nombre, cant, _fmt_money(valor)], colxs, widths, row_h=18)

    _footer(c, page)
    c.save()
    return output_path


def generar_resumen_mantenimientos(
    mantenimientos,
    total: int,
    company: dict,
    output_path: Path,
) -> Path:
    """Reporte en PDF del resumen de registros de mantenimiento."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output_path), pagesize=A4)
    _draw_watermark(c, company.get("marca_agua") or company["nombre"])

    y = _header(c, company, "RESUMEN DE MANTENIMIENTOS")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(*BLACK)
    c.drawString(MARGIN, y, f"TOTAL DE REGISTROS: {total}")
    y -= 24

    headers = ["FOLIO", "EQUIPO", "TIPO", "TÉCNICO", "ESTADO", "PRIORIDAD"]
    widths = [0.11, 0.27, 0.14, 0.20, 0.14, 0.14]
    total_w = PAGE_W - 2 * MARGIN
    widths = [total_w * f for f in widths]
    y, colxs = _table_header(c, y, headers, widths, row_h=18)
    y -= 2

    page = 1
    if not mantenimientos:
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN, y - 12, "Sin mantenimientos registrados.")
        y -= 20

    c.setFont("Helvetica", 7.5)
    for m in mantenimientos:
        if y < MARGIN + 40:
            _footer(c, page)
            c.showPage()
            page += 1
            _draw_watermark(c, company.get("marca_agua") or company["nombre"])
            y = _header(c, company, "RESUMEN DE MANTENIMIENTOS")
            c.setFont("Helvetica-Bold", 9)
            c.drawString(MARGIN, y, f"TOTAL DE REGISTROS: {total}")
            y -= 24
            y, colxs = _table_header(c, y, headers, widths, row_h=18)
            y -= 2
            c.setFont("Helvetica", 7.5)

        folio = m.get("folio") or "-"
        equipo = m.get("equipo") or "-"
        tipo = m.get("tipo") or "-"
        tecnico = (m.get("tecnico") or "-")
        estado = m.get("estado") or "-"
        prioridad = (m.get("prioridad") or "media").upper()
        y = _table_row(c, y, [folio, equipo, tipo, tecnico, estado, prioridad], colxs, widths, row_h=18)

    _footer(c, page)
    c.save()
    return output_path


def _fmt_reporte_fecha(value) -> str:
    if value is None:
        return "-"
    if isinstance(value, str):
        return value[:16]
    return value.strftime("%Y-%m-%d")


def _conteos_registros(registros, ahora=None):
    """Resumen por estado de una lista de dicts de mantenimiento."""
    total = len(registros)
    programado = sum(1 for r in registros if r.get("estado") == "programado")
    en_proceso = sum(1 for r in registros if r.get("estado") == "en_proceso")
    finalizado = sum(1 for r in registros if r.get("estado") == "finalizado")
    now = ahora or datetime.now(timezone.utc)
    vencidos = sum(
        1
        for r in registros
        if r.get("estado") != "finalizado" and r.get("fecha_programada") and r["fecha_programada"] < now
    )
    return {
        "total": total,
        "programado": programado,
        "en_proceso": en_proceso,
        "pendientes": programado + en_proceso,
        "finalizado": finalizado,
        "vencidos": vencidos,
    }


def _seccion_pdf(c, y, texto):
    c.setFillColorRGB(*BLUE)
    c.rect(MARGIN, y - 20, PAGE_W - 2 * MARGIN, 20, fill=1, stroke=0)
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(MARGIN + 6, y - 13, texto.upper())
    return y - 30


def generar_reporte_tecnico_pdf(
    grupos,
    total: int,
    desde: str,
    hasta: str,
    company: dict,
    output_path: Path,
    ahora=None,
) -> Path:
    """Acta/nombramiento (PDF): mantenimientos asignados por técnico en un rango."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fecha_gen = (ahora or datetime.now()).strftime("%Y-%m-%d %H:%M:%S")

    c = canvas.Canvas(str(output_path), pagesize=A4)
    marca = company.get("marca_agua") or company["nombre"]
    _draw_watermark(c, marca)

    y = _header(c, company, "NOMBRAMIENTO POR TÉCNICO — MANTENIMIENTOS")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(*BLACK)
    c.drawString(MARGIN, y, f"DESDE: {desde}" if desde else "DESDE: —")
    c.drawRightString(PAGE_W - MARGIN, y, f"HASTA: {hasta}" if hasta else "HASTA: —")
    y -= 18
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, y, f"TOTAL DE MANTENIMIENTOS: {total}")
    c.drawRightString(PAGE_W - MARGIN, y, f"GENERADO: {fecha_gen}")
    y -= 20

    headers = ["FOLIO", "EQUIPO", "TIPO", "SEDE", "FECHA", "ESTADO", "PRIO"]
    widths = [0.10, 0.24, 0.12, 0.17, 0.15, 0.11, 0.11]
    total_w = PAGE_W - 2 * MARGIN
    widths = [total_w * f for f in widths]

    page = 1
    if not grupos:
        c.setFont("Helvetica", 9)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN, y - 14, "SIN MANTENIMIENTOS PARA EL RANGO SELECCIONADO.")
        y -= 40
    else:
        for grupo in grupos:
            nombre = (grupo.get("tecnico") or "SIN TÉCNICO").upper()
            if y < MARGIN + 90:
                _footer(c, page)
                c.showPage()
                page += 1
                _draw_watermark(c, marca)
                y = _header(c, company, "NOMBRAMIENTO POR TÉCNICO — MANTENIMIENTOS")
                c.setFont("Helvetica", 8)
                c.setFillColorRGB(*GRAY_TEXT)
                y -= 24

            y = _seccion_pdf(c, y, f"Técnico: {nombre}")
            c.setFont("Helvetica", 8.5)
            c.setFillColorRGB(*GRAY_TEXT)
            cnt = grupo.get("conteos", {})
            c.drawString(
                MARGIN, y - 4,
                f"Total: {cnt.get('total', 0)} · Programados: {cnt.get('programado', 0)} · "
                f"En proceso: {cnt.get('en_proceso', 0)} · Finalizados: {cnt.get('finalizado', 0)} · "
                f"Vencidos: {cnt.get('vencidos', 0)}",
            )
            y -= 20

            y, colxs = _table_header(c, y, headers, widths, row_h=16)
            y -= 2
            c.setFont("Helvetica", 7.5)
            for reg in grupo.get("registros", []):
                if y < MARGIN + 50:
                    _footer(c, page)
                    c.showPage()
                    page += 1
                    _draw_watermark(c, marca)
                    y = _header(c, company, "NOMBRAMIENTO POR TÉCNICO — MANTENIMIENTOS")
                    y -= 24
                    y, colxs = _table_header(c, y, headers, widths, row_h=16)
                    y -= 2
                    c.setFont("Helvetica", 7.5)
                y = _table_row(
                    c, y,
                    [
                        reg.get("folio") or "-",
                        reg.get("equipo") or "-",
                        reg.get("tipo") or "-",
                        reg.get("punto") or "-",
                        _fmt_reporte_fecha(reg.get("fecha_programada")),
                        reg.get("estado") or "-",
                        (reg.get("prioridad") or "media").upper(),
                    ],
                    colxs, widths, row_h=16,
                )
            y -= 8

    if y < MARGIN + 140:
        _footer(c, page)
        c.showPage()
        page += 1
        _draw_watermark(c, marca)
        y = _header(c, company, "NOMBRAMIENTO POR TÉCNICO — MANTENIMIENTOS")
        y -= 30

    # Firma estilo acta.
    firma_y = MARGIN + 36
    col_w = (PAGE_W - 2 * MARGIN) / 2
    c.setStrokeColorRGB(*BLACK)
    c.setLineWidth(0.6)
    c.line(MARGIN, firma_y, MARGIN + col_w - 20, firma_y)
    c.line(MARGIN + col_w + 20, firma_y, PAGE_W - MARGIN, firma_y)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(MARGIN, firma_y - 12, "TÉCNICO RESPONSABLE")
    c.drawString(MARGIN + col_w + 20, firma_y - 12, "JEFE DE MANTENIMIENTO")

    _footer(c, page)
    c.save()
    return output_path


def generar_reporte_sede_pdf(
    grupos,
    total: int,
    desde: str,
    hasta: str,
    company: dict,
    output_path: Path,
    ahora=None,
) -> Path:
    """Reporte (PDF): mantenimientos realizados y pendientes agrupados por sede."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fecha_gen = (ahora or datetime.now()).strftime("%Y-%m-%d %H:%M:%S")

    c = canvas.Canvas(str(output_path), pagesize=A4)
    marca = company.get("marca_agua") or company["nombre"]
    _draw_watermark(c, marca)

    y = _header(c, company, "REPORTE DE MANTENIMIENTOS POR SEDE")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(*BLACK)
    c.drawString(MARGIN, y, f"DESDE: {desde}" if desde else "DESDE: —")
    c.drawRightString(PAGE_W - MARGIN, y, f"HASTA: {hasta}" if hasta else "HASTA: —")
    y -= 18
    c.drawString(MARGIN, y, f"TOTAL DE MANTENIMIENTOS: {total}")
    c.drawRightString(PAGE_W - MARGIN, y, f"GENERADO: {fecha_gen}")
    y -= 20

    headers = ["FOLIO", "EQUIPO", "TIPO", "TÉCNICO", "FECHA", "ESTADO"]
    widths = [0.11, 0.27, 0.13, 0.18, 0.16, 0.15]
    total_w = PAGE_W - 2 * MARGIN
    widths = [total_w * f for f in widths]

    page = 1
    if not grupos:
        c.setFont("Helvetica", 9)
        c.setFillColorRGB(*BLACK)
        c.drawString(MARGIN, y - 12, "Sin mantenimientos para el rango seleccionado.")
        y -= 40
    else:
        for grupo in grupos:
            nombre = (grupo.get("punto") or "SIN SEDE").upper()
            if y < MARGIN + 90:
                _footer(c, page)
                c.showPage()
                page += 1
                _draw_watermark(c, marca)
                y = _header(c, company, "REPORTE DE MANTENIMIENTOS POR SEDE")
                y -= 24

            y = _seccion_pdf(c, y, f"Sede: {nombre}")
            cnt = grupo.get("conteos", {})
            c.setFont("Helvetica", 8.5)
            c.setFillColorRGB(*GRAY_TEXT)
            c.drawString(
                MARGIN, y - 4,
                f"Total: {cnt.get('total', 0)} · Realizados: {cnt.get('finalizado', 0)} · "
                f"Pendientes: {cnt.get('pendientes', 0)} · Vencidos: {cnt.get('vencidos', 0)}",
            )
            y -= 20

            y, colxs = _table_header(c, y, headers, widths, row_h=16)
            y -= 2
            c.setFont("Helvetica", 7.5)
            for reg in grupo.get("registros", []):
                if y < MARGIN + 50:
                    _footer(c, page)
                    c.showPage()
                    page += 1
                    _draw_watermark(c, marca)
                    y = _header(c, company, "REPORTE DE MANTENIMIENTOS POR SEDE")
                    y -= 24
                    y, colxs = _table_header(c, y, headers, widths, row_h=16)
                    y -= 2
                    c.setFont("Helvetica", 7.5)
                y = _table_row(
                    c, y,
                    [
                        reg.get("folio") or "-",
                        reg.get("equipo") or "-",
                        reg.get("tipo") or "-",
                        reg.get("tecnico") or "-",
                        _fmt_reporte_fecha(reg.get("fecha_programada")),
                        reg.get("estado") or "-",
                    ],
                    colxs, widths, row_h=16,
                )
            y -= 8

    _footer(c, page)
    c.save()
    return output_path