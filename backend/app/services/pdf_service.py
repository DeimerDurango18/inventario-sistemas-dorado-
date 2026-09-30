"""Generación de actas PDF (formato ORDEN DE SALIDA / ORDEN DE ENTRADA, membrete ETICOS)."""

from __future__ import annotations

import io
import re
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.services import files_service

_GRAY = colors.HexColor("#555555")
_BORDER = colors.HexColor("#999999")

_TITULOS_DOC = {
    "ASIGNACION": "ORDEN DE SALIDA",
    "DEVOLUCION": "ORDEN DE ENTRADA",
    "TRASLADO": "ORDEN DE TRASLADO",
    "AJUSTE": "ORDEN DE AJUSTE",
    "PRESTAMO": "ORDEN DE PRÉSTAMO",
    "MANTENIMIENTO": "ACTA DE MANTENIMIENTO",
    "BAJA": "ACTA DE BAJA",
    "ENTRADA": "ORDEN DE ENTRADA",
    "SALIDA": "ORDEN DE SALIDA",
    "INSTALACION": "ACTA DE INSTALACIÓN",
    "REUBICACION": "ACTA DE REUBICACIÓN",
    "SOPORTE_SITIO": "ACTA DE SOPORTE EN SITIO",
    "RETIRO": "ACTA DE RETIRO DE EQUIPO",
}

_PARAMS_DEFAULTS = {
    "empresa_nombre": "SISTEMAS BOGOTÁ",
    "empresa_comercial": "ETICOS BOGOTÁ",
    "empresa_nit": "892300678-7",
    "empresa_telefono": "601 587 3010",
    "empresa_direccion": "AUTOPISTA MEDELLÍN KM 3.5 COSTADO NORTE CENTRO EMPRESARIAL METROPOLITANO",
    "encargado_nombre": "EDILFER AGUIRRE",
    "encargado_cargo": "DESPACHO BODEGA",
    "destino_nombre": "BODEGA BOGOTÁ",
}


def _params(db) -> dict:
    from app.models.system import Parametro
    from sqlalchemy import select

    datos = dict(_PARAMS_DEFAULTS)
    for p in db.scalars(select(Parametro)).all():
        if p.valor:
            datos[p.clave] = p.valor
    return datos


def _titulo_documento(acta_operacion_tipo: str | None, acta_tipo: str) -> str:
    if acta_operacion_tipo == "TRASLADO":
        return _TITULOS_DOC["TRASLADO"]
    for clave, valor in _TITULOS_DOC.items():
        if (acta_operacion_tipo or "").upper() == clave or (acta_tipo or "").upper() == clave:
            return valor
    return "DOCUMENTO DE GESTIÓN DE EQUIPOS"


def _datos_tabla(acta, op) -> list[list[str]]:
    from app.models.stock import MovimientoStock

    if isinstance(op, MovimientoStock):
        seriales = getattr(op, "seriales", None) or []
        if op.referencia_tipo == "ITEM" and op.item is not None:
            marca = op.item.marca.nombre if getattr(op.item.marca, "nombre", None) else ""
            modelo = op.item.modelo.nombre if getattr(op.item.modelo, "nombre", None) else ""
            detalle = op.item.nombre or ""
            if modelo:
                detalle += f" · {modelo}"
            if seriales:
                return [[op.item.tipo or "ITEM", marca, detalle, "1", s] for s in seriales]
            return [[op.item.tipo or "ITEM", marca, detalle, str(op.cantidad), "—"]]
        if op.referencia_tipo == "ACTIVO" and op.activo is not None:
            a = op.activo
            marca = a.marca.nombre if getattr(a.marca, "nombre", None) else ""
            detalle = a.serial or (a.codigo_inventario or a.placa or a.codigo)
            if seriales:
                return [[a.tipo or "", marca, detalle, "1", s] for s in seriales]
            return [[a.tipo or "", marca, detalle, str(op.cantidad), a.serial or "—"]]
    activo = None
    if op is not None and getattr(op, "activo", None):
        activo = op.activo
    elif getattr(acta, "activo", None):
        activo = acta.activo
    seriales = getattr(op, "seriales", None) or []
    if activo is None:
        # Mantenimiento programado a una sede/farmacia o ubicación: lista los
        # seriales de los equipos atendidos, aunque no estén ligados a un activo.
        if seriales:
            ref = "MANTENIMIENTO"
            if getattr(op, "sede", None) and op.sede:
                ref = f"{op.sede.nombre or op.sede.codigo or 'Sede'}"[:40]
            elif getattr(op, "ubicacion", None):
                ref = f"{op.ubicacion.nombre or 'Ubicación'}"[:40]
            return [[ref, "", "Equipo atendido", "1", s] for s in seriales]
        if getattr(op, "sede", None) and op.sede:
            return [[op.sede.nombre or op.sede.codigo or "Sede", "", "", str(getattr(op, "cantidad", 1) or 1), "—"]]
        if getattr(op, "ubicacion", None):
            return [[op.ubicacion.nombre or "Ubicación", "", "", str(getattr(op, "cantidad", 1) or 1), "—"]]
        return [["", "", "", "", ""]]
    marca = activo.marca.nombre if getattr(activo.marca, "nombre", None) else (activo.tipo or "")
    if seriales:
        return [
            [activo.tipo or "", marca, activo.serial or (activo.codigo_inventario or activo.placa or ""), "1", s]
            for s in seriales
        ]
    cantidad = getattr(op, "cantidad", None)
    return [
        [
            activo.tipo or "",
            marca,
            activo.serial or (activo.codigo_inventario or activo.placa or ""),
            str(cantidad or 1),
            activo.serial or "",
        ]
    ]


def _encabezado_params(db, op) -> dict:
    """Datos de cuerpo del documento derivados de la operación."""
    info: dict = {}
    if op is None:
        return info
    try:
        if getattr(op, "observaciones", None):
            info["observaciones"] = op.observaciones
        if getattr(op, "resultado", None):
            info["resultado"] = op.resultado
        if getattr(op, "costo", None):
            info["valor"] = f"$ {float(op.costo):,.0f}"
        if getattr(op, "valor", None):
            info["valor"] = f"$ {float(op.valor):,.0f}"
        if getattr(op, "destino", None):
            info["destino_nombre"] = op.destino
            info["destino_persona"] = op.destino
        if getattr(op, "sede", None) and op.sede:
            info["destino_nombre"] = op.sede.nombre
        if getattr(op, "ubicacion", None) and op.ubicacion:
            info["destino_nombre"] = op.ubicacion.nombre
        if getattr(op, "documento", None):
            info["documento"] = op.documento
        if getattr(op, "motivo_descripcion", None):
            info["observaciones"] = op.motivo_descripcion
        if getattr(op, "responsable", None) and op.responsable:
            info["destino_persona"] = op.responsable.nombre
        if getattr(op, "motivo", None):
            info["motivo"] = op.motivo
    except Exception:
        pass
    return info


_MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def _fecha_larga(dt) -> str:
    return f"{dt.day} de {_MESES_ES[dt.month - 1]} de {dt.year}"


def _fotos_mantenimiento(db, op) -> list[tuple[RLImage, str, str]]:
    """Devuelve (imagen, serial, nombre_original) de las fotos adjuntas al mantenimiento."""
    if op is None or getattr(op, "id", None) is None:
        return []
    from app.models.documental import Archivo
    from sqlalchemy import select

    fotos: list[tuple[RLImage, str, str]] = []
    try:
        archivos = db.scalars(
            select(Archivo)
            .where(Archivo.entidad_tipo == "MANTENIMIENTO", Archivo.entidad_id == op.id)
            .order_by(Archivo.id)
        ).all()
    except Exception:
        return []
    for a in archivos:
        if not (a.mime or "").startswith("image/"):
            continue
        try:
            p = files_service.ruta_disco(a)
            if not p.exists():
                continue
            from PIL import Image as PILImage

            with PILImage.open(p) as im:
                w, h = im.size
            max_w, max_h = 7.6 * cm, 6.8 * cm
            ratio = min(max_w / w, max_h / h, 1.0)
            img = RLImage(str(p), width=max(1 * cm, w * ratio), height=max(1 * cm, h * ratio))
            fotos.append((img, a.serial or "", a.nombre_original or ""))
        except Exception:
            continue
    return fotos


def _seccion_fotos(fotos: list[tuple[RLImage, str, str]], st_obs) -> Table | None:
    """Grilla de fotos de 2 por fila, con el serial y el nombre debajo de cada una."""
    if not fotos:
        return None
    from reportlab.platypus import Table as _T

    st_serial = ParagraphStyle("foto_serial", parent=getSampleStyleSheet()["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, alignment=TA_CENTER)
    st_name = ParagraphStyle("foto_name", parent=getSampleStyleSheet()["Normal"], fontSize=7, leading=9, alignment=TA_CENTER, textColor=_GRAY)
    ancho = 8.55 * cm
    filas: list = []
    fila: list = []
    for img, serial, nombre in fotos:
        cell = [
            [img],
            [Paragraph(f"Serial: {serial}" if serial else "Serial: —", st_serial)],
            [Paragraph(nombre[:38], st_name)],
        ]
        cell_t = _T(cell, colWidths=[ancho])
        cell_t.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )
        fila.append(cell_t)
        if len(fila) == 2:
            filas.append(fila)
            fila = []
    if fila:
        filas.append(fila)
    if not filas:
        return None
    tabla = _T(filas, colWidths=[ancho, ancho])
    tabla.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.7, _BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.7, _BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return tabla


def _render_instalacion(acta, op, db) -> bytes:
    """Acta de instalación/servicio en sitio, formato de carta formal (modelo ETICOS)."""
    if op is None:
        return _render(acta, op, db)

    p = _params(db)
    fecha = op.fecha_ejecucion or acta.fecha or datetime.now(timezone.utc)
    if getattr(fecha, "tzinfo", None):
        fecha = fecha.astimezone()

    destino = (op.ubicacion.nombre if getattr(op, "ubicacion", None) and op.ubicacion
               else (op.activo.codigo if getattr(op, "activo", None) and op.activo
                     else (op.cliente if getattr(op, "cliente", None) else "")))
    destino_texto = destino or p.get("destino_nombre", "SEDE / FARMACIA")

    tipo_serv = (getattr(op, "tipo_servicio", None) or "INSTALACION").replace("_", " ").lower()
    ciudad = p.get("empresa_ciudad", "BOGOTÁ")
    fecha_esp = _fecha_larga(fecha)
    tecnico = (getattr(op, "tecnico", None) or "").strip()
    cliente = (getattr(op, "cliente", None) or "").strip()
    descripcion = ((getattr(op, "descripcion", None) or "").strip()
                   or (acta.observaciones or "") or "")

    estilos = getSampleStyleSheet()
    st_empresa = ParagraphStyle("empresa", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=14, leading=17, textColor=colors.HexColor("#1a1a4e"))
    st_comercial = ParagraphStyle("comercial", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=13)
    st_dato = ParagraphStyle("dato", parent=estilos["Normal"], fontSize=8.5, leading=11, textColor=_GRAY)
    st_num = ParagraphStyle("num", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=13, alignment=TA_CENTER)
    st_titulo_doc = ParagraphStyle("tdo", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=16, leading=19, alignment=TA_CENTER, textColor=colors.HexColor("#1a1a4e"))
    st_p = ParagraphStyle("p", parent=estilos["Normal"], fontSize=10, leading=15, alignment=TA_JUSTIFY)
    st_dir = ParagraphStyle("dir", parent=estilos["Normal"], fontSize=10, leading=15)
    st_firma = ParagraphStyle("firma", parent=estilos["Normal"], fontSize=8.5, leading=11, alignment=TA_CENTER)
    st_sec = ParagraphStyle("sec", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=colors.HexColor("#1a1a4e"))

    numero_display = re.sub(r"^([A-Za-z]+)-0+(\d+)$", r"\1-\2", acta.numero or "")
    titulo = _titulo_documento(acta.operacion_tipo, acta.tipo)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        leftMargin=2.0 * cm,
        rightMargin=2.0 * cm,
        title=f"{titulo} {acta.numero}",
        author=p.get("empresa_nombre", "ETICOS"),
    )

    elementos: list = []

    izq = Table(
        [
            [Paragraph(p.get("empresa_nombre", "SISTEMAS BOGOTÁ"), st_empresa)],
            [Paragraph(p.get("empresa_comercial", "ETICOS BOGOTÁ"), st_comercial)],
            [Paragraph(f'NIT: {p.get("empresa_nit", "892300678-7")}', st_dato)],
            [Paragraph(p.get("empresa_direccion", ""), st_dato)],
            [Paragraph(f'TEL: {p.get("empresa_telefono", "")}', st_dato)],
        ],
        colWidths=[9.2 * cm],
    )
    izq.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0)]))

    der = Table(
        [
            [Paragraph(f"<b>{titulo}</b>", st_titulo_doc)],
            [Paragraph("N° " + numero_display, st_num)],
            [Paragraph(f'<b>FECHA:</b> {fecha.strftime("%d/%m/%Y")}', st_dato)],
            [Paragraph(f'<b>CIUDAD:</b> {ciudad}', st_dato)],
        ],
        colWidths=[7.2 * cm],
    )
    der.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, _BORDER),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f2f3ff")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    cabeza = Table([[izq, der]], colWidths=[9.2 * cm, 7.2 * cm])
    cabeza.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    elementos.append(cabeza)
    elementos.append(Spacer(1, 0.3 * cm))
    elementos.append(HRFlowable(width="100%", thickness=1.4, color=colors.HexColor("#1a1a4e")))
    elementos.append(Spacer(1, 0.7 * cm))

    elementos.append(Paragraph(f"{ciudad}, {fecha_esp}", st_dir))
    elementos.append(Spacer(1, 0.4 * cm))
    if cliente:
        elementos.append(Paragraph("<b>Señores:</b>", st_p))
        elementos.append(Paragraph(cliente, st_p))
        elementos.append(Spacer(1, 0.3 * cm))

    elementos.append(Paragraph(f"<b>CUMPLIDO: </b>{fecha.strftime('%d/%m/%Y')}", st_p))
    elementos.append(Spacer(1, 0.2 * cm))

    intro = (
        "La presente es para dejar constancia escrita del servicio técnico "
        f"({tipo_serv}) ejecutado en {destino_texto} el día {fecha_esp}, "
        "con el fin de dejar registro de las labores realizadas por el área de sistemas."
    )
    elementos.append(Paragraph(intro, st_p))
    elementos.append(Spacer(1, 0.25 * cm))

    if descripcion:
        elementos.append(Paragraph("<b>Descripción del trabajo realizado:</b>", st_p))
        elementos.append(Paragraph(descripcion, st_p))
        elementos.append(Spacer(1, 0.3 * cm))

    if tecnico:
        filas = [
            [Paragraph("<b>LUGAR DE EJECUCIÓN:</b>", st_p), Paragraph(destino_texto, st_p)],
            [Paragraph("<b>TÉCNICO RESPONSABLE:</b>", st_p), Paragraph(tecnico, st_p)],
        ]
        if cliente:
            filas.append([Paragraph("<b>CLIENTE / RESPONSABLE:</b>", st_p), Paragraph(cliente, st_p)])
        t_tec = Table(filas, colWidths=[5.4 * cm, 11.0 * cm])
        t_tec.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, _BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f2f3ff")),
                ]
            )
        )
        elementos.append(t_tec)
        elementos.append(Spacer(1, 0.35 * cm))

    elementos.append(Spacer(1, 0.5 * cm))
    elementos.append(Paragraph(
        "Para confirmar lo anterior, firma el documento el responsable del punto atendido "
        "y el personal del área de sistemas encargado del servicio.",
        st_p,
    ))
    elementos.append(Spacer(1, 1.0 * cm))

    f_tabla = Table(
        [
            [Paragraph("<b>__________________________________</b>", st_firma), Paragraph("<b>__________________________________</b>", st_firma)],
            [Paragraph("RECIBÍ CONFORME", st_firma), Paragraph("ÁREA DE SISTEMAS", st_firma)],
            [
                Paragraph(cliente or destino_texto, st_firma),
                Paragraph(p.get("encargado_nombre", "") + " - " + p.get("encargado_cargo", ""), st_firma),
            ],
        ],
        colWidths=[8.2 * cm, 8.2 * cm],
    )
    f_tabla.setStyle(
        TableStyle(
            [
                ("TOPPADDING", (0, 0), (-1, -1), 16),
                ("LINEABELOW", (0, 0), (0, 0), 0.7, colors.black),
                ("LINEABELOW", (1, 0), (1, 0), 0.7, colors.black),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2f3ff")),
            ]
        )
    )
    elementos.append(f_tabla)

    def on_page(canvas, documento):
        canvas.saveState()
        canvas.setStrokeColor(_BORDER)
        canvas.setLineWidth(0.6)
        canvas.line(2.0 * cm, 1.0 * cm, letter[0] - 2.0 * cm, 1.0 * cm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(_GRAY)
        canvas.drawString(2.0 * cm, 0.78 * cm, p.get("empresa_nombre", "ETICOS") + " · " + p.get("empresa_direccion", ""))
        canvas.drawRightString(letter[0] - 2.0 * cm, 0.78 * cm, f"Pag. {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(elementos, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()


def _render_mantenimiento(acta, op, db) -> bytes:
    """Acta de mantenimiento en formato de carta formal (modelo ETICOS)."""
    if op is None:
        return _render(acta, op, db)
    from sqlalchemy import select

    p = _params(db)
    fecha = op.fecha_ejecucion or acta.fecha or datetime.now(timezone.utc)
    if getattr(fecha, "tzinfo", None):
        fecha = fecha.astimezone()

    destino = (op.sede.nombre if getattr(op, "sede", None) and op.sede
               else (op.ubicacion.nombre if getattr(op, "ubicacion", None) and op.ubicacion
                     else (op.activo.codigo if getattr(op, "activo", None) and op.activo else "")))
    destino_texto = destino or p.get("destino_nombre", "SEDE / FARMACIA")

    seriales = getattr(op, "seriales", None) or []
    tipo_mant = (getattr(op, "tipo", None) or "PREVENTIVO").lower()
    ciudad = p.get("empresa_ciudad", "BOGOTÁ")
    fecha_esp = _fecha_larga(fecha)

    actividades = (getattr(op, "actividades", None) or getattr(op, "proposito", None) or "").strip()
    resultado = (getattr(op, "resultado", None) or "").strip()
    observaciones = (getattr(op, "observaciones", None) or "").strip()

    estilos = getSampleStyleSheet()
    st_empresa = ParagraphStyle("empresa", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=14, leading=17, textColor=colors.HexColor("#1a1a4e"))
    st_comercial = ParagraphStyle("comercial", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=13)
    st_dato = ParagraphStyle("dato", parent=estilos["Normal"], fontSize=8.5, leading=11, textColor=_GRAY)
    st_num = ParagraphStyle("num", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=13, alignment=TA_CENTER)
    st_titulo_doc = ParagraphStyle("tdo", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=16, leading=19, alignment=TA_CENTER, textColor=colors.HexColor("#1a1a4e"))
    st_p = ParagraphStyle("p", parent=estilos["Normal"], fontSize=10, leading=15, alignment=TA_JUSTIFY)
    st_dir = ParagraphStyle("dir", parent=estilos["Normal"], fontSize=10, leading=15)
    st_firma = ParagraphStyle("firma", parent=estilos["Normal"], fontSize=8.5, leading=11, alignment=TA_CENTER)
    st_serial = ParagraphStyle("serial", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=10.5, leading=15)

    numero_display = re.sub(r"^([A-Za-z]+)-0+(\d+)$", r"\1-\2", acta.numero or "")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        leftMargin=2.0 * cm,
        rightMargin=2.0 * cm,
        title=f"ACTA DE MANTENIMIENTO {acta.numero}",
        author=p.get("empresa_nombre", "ETICOS"),
    )

    elementos: list = []

    # ------------------------------------------------------------ encabezado empresa
    izq = Table(
        [
            [Paragraph(p.get("empresa_nombre", "SISTEMAS BOGOTÁ"), st_empresa)],
            [Paragraph(p.get("empresa_comercial", "ETICOS BOGOTÁ"), st_comercial)],
            [Paragraph(f'NIT: {p.get("empresa_nit", "892300678-7")}', st_dato)],
            [Paragraph(p.get("empresa_direccion", ""), st_dato)],
            [Paragraph(f'TEL: {p.get("empresa_telefono", "")}', st_dato)],
        ],
        colWidths=[9.2 * cm],
    )
    izq.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0)]))

    der = Table(
        [
            [Paragraph("<b>ACTA DE MANTENIMIENTO</b>", st_titulo_doc)],
            [Paragraph("N° " + numero_display, st_num)],
            [Paragraph(f'<b>FECHA:</b> {fecha.strftime("%d/%m/%Y")}', st_dato)],
            [Paragraph(f'<b>CIUDAD:</b> {ciudad}', st_dato)],
        ],
        colWidths=[7.2 * cm],
    )
    der.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, _BORDER),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f2f3ff")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    cabeza = Table([[izq, der]], colWidths=[9.2 * cm, 7.2 * cm])
    cabeza.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    elementos.append(cabeza)
    elementos.append(Spacer(1, 0.3 * cm))
    elementos.append(HRFlowable(width="100%", thickness=1.4, color=colors.HexColor("#1a1a4e")))
    elementos.append(Spacer(1, 0.7 * cm))

    # ------------------------------------------------------------ fecha + destinatario
    elementos.append(Paragraph(f"{ciudad}, {fecha_esp}", st_dir))
    elementos.append(Spacer(1, 0.5 * cm))
    elementos.append(Paragraph("<b>Regente,</b>", st_dir))
    elementos.append(Paragraph(destino_texto, st_dir))
    elementos.append(Spacer(1, 0.5 * cm))

    # ------------------------------------------------------------ cuerpo formal
    intro = (
        "La presente es para dejar constancia por escrito sobre el mantenimiento realizado "
        f"a los equipos en {destino_texto} el día {fecha_esp}. Entre las acciones realizadas "
        f"en el mantenimiento {tipo_mant} están:"
    )
    elementos.append(Paragraph(intro, st_p))
    elementos.append(Spacer(1, 0.2 * cm))

    if actividades:
        for linea in actividades.splitlines():
            linea = linea.strip().strip("-").strip()
            if linea:
                elementos.append(Paragraph(f"- {linea};", st_p))
        elementos.append(Spacer(1, 0.25 * cm))

    if seriales:
        elementos.append(Paragraph(
            "Los equipos que se intervinieron para el mantenimiento están con los siguientes seriales:",
            st_p,
        ))
        elementos.append(Spacer(1, 0.1 * cm))
        elementos.append(Paragraph(", ".join(seriales), st_serial))
        elementos.append(Spacer(1, 0.25 * cm))
    elif op.activo and op.activo.serial:
        elementos.append(Paragraph(
            "El equipo intervenido para el mantenimiento corresponde al serial:",
            st_p,
        ))
        elementos.append(Spacer(1, 0.1 * cm))
        elementos.append(Paragraph(op.activo.serial, st_serial))
        elementos.append(Spacer(1, 0.25 * cm))

    if resultado:
        elementos.append(Paragraph(f"<b>Resultado del mantenimiento:</b> {resultado}", st_p))
        elementos.append(Spacer(1, 0.2 * cm))
    if observaciones:
        elementos.append(Paragraph(f"<b>Observaciones:</b> {observaciones}", st_p))
        elementos.append(Spacer(1, 0.2 * cm))

    # ------------------------------------------------------------ registro fotográfico
    con_fotos = getattr(op, "acta_con_fotos", True)
    if con_fotos:
        fotos = _fotos_mantenimiento(db, op)
        if fotos:
            elementos.append(Spacer(1, 0.2 * cm))
            st_sec = ParagraphStyle("sec", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=colors.HexColor("#1a1a4e"))
            elementos.append(Paragraph("REGISTRO FOTOGRÁFICO", st_sec))
            elementos.append(Paragraph("Fotografías de los equipos atendidos, identificadas por serial.", st_p))
            elementos.append(Spacer(1, 0.2 * cm))
            grilla = _seccion_fotos(fotos, st_p)
            if grilla is not None:
                elementos.append(grilla)
            elementos.append(Spacer(1, 0.4 * cm))

    # ------------------------------------------------------------ cierre + firmas
    elementos.append(Paragraph(
        "Para confirmar lo anterior, firma el documento el regente de turno y el personal del "
        "área de sistemas encargado del mantenimiento de los equipos.",
        st_p,
    ))
    elementos.append(Spacer(1, 1.0 * cm))

    firma_iso_calendario = Paragraph(
        f"{'_____' * 12}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{p.get('encargado_nombre', '')}",
        st_firma,
    )
    f_tabla = Table(
        [
            [Paragraph("<b>__________________________________</b>", st_firma), Paragraph("<b>__________________________________</b>", st_firma)],
            [Paragraph("REGENTE", st_firma), Paragraph("ÁREA DE SISTEMAS", st_firma)],
            [Paragraph(destino_texto, st_firma), Paragraph(p.get("encargado_nombre", "") + " - " + p.get("encargado_cargo", ""), st_firma)],
        ],
        colWidths=[8.2 * cm, 8.2 * cm],
    )
    f_tabla.setStyle(
        TableStyle(
            [
                ("TOPPADDING", (0, 0), (-1, -1), 16),
                ("LINEABELOW", (0, 0), (0, 0), 0.7, colors.black),
                ("LINEABELOW", (1, 0), (1, 0), 0.7, colors.black),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2f3ff")),
            ]
        )
    )
    elementos.append(f_tabla)

    # ------------------------------------------------------------ pie de página
    def on_page(canvas, documento):
        canvas.saveState()
        canvas.setStrokeColor(_BORDER)
        canvas.setLineWidth(0.6)
        canvas.line(2.0 * cm, 1.0 * cm, letter[0] - 2.0 * cm, 1.0 * cm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(_GRAY)
        canvas.drawString(2.0 * cm, 0.78 * cm, p.get("empresa_nombre", "ETICOS") + " · " + p.get("empresa_direccion", ""))
        canvas.drawRightString(letter[0] - 2.0 * cm, 0.78 * cm, f"Pag. {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(elementos, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()


def _render(acta, op, db) -> bytes:
    p = _params(db)
    cuerpo = _encabezado_params(db, op)
    fecha = acta.fecha or datetime.now(timezone.utc)
    if fecha.tzinfo:
        fecha = fecha.astimezone()
    fecha_str = fecha.strftime("%d/%m/%Y %H:%M")

    estilos = getSampleStyleSheet()
    titulo = _titulo_documento(acta.operacion_tipo, acta.tipo)
    tabla_datos = _datos_tabla(acta, op)
    obs = cuerpo.get("observaciones") or getattr(acta, "observaciones", None) or ""

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        title=f"{titulo} {acta.numero}",
        author=p.get("empresa_nombre", "ETICOS"),
    )

    st_empresa = ParagraphStyle("empresa", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=colors.HexColor("#1a1a4e"))
    st_comercial = ParagraphStyle("comercial", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=12, leading=14)
    st_dato = ParagraphStyle("dato", parent=estilos["Normal"], fontSize=8.5, leading=11, textColor=_GRAY)
    st_num = ParagraphStyle("num", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=13, alignment=TA_CENTER)
    st_titulo_doc = ParagraphStyle("tdo", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=17, leading=20, alignment=TA_CENTER, textColor=colors.HexColor("#1a1a4e"))
    st_p = ParagraphStyle("p", parent=estilos["Normal"], fontSize=9.5, leading=14, alignment=TA_LEFT)
    st_td = ParagraphStyle("td", parent=estilos["Normal"], fontSize=9, leading=12)
    st_tdh = ParagraphStyle("tdh", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=colors.white)
    st_obs = ParagraphStyle("obs", parent=estilos["Normal"], fontSize=9, leading=13)
    st_firma = ParagraphStyle("firma", parent=estilos["Normal"], fontSize=8.5, leading=11, alignment=TA_CENTER)

    asunto = ""
    if (acta.operacion_tipo or "").upper() == "ASIGNACION":
        asunto = "Por medio de la presente se autoriza la salida del equipo detallado, asignado para uso de"
        if cuerpo.get("destino_persona"):
            asunto += f" {cuerpo['destino_persona']}."
        else:
            asunto += " su responsable."
    elif (acta.operacion_tipo or "").upper() == "DEVOLUCION":
        asunto = "Se hace constar la entrada a bodega del equipo detallado, devuelto por su anterior responsable."
    elif (acta.operacion_tipo or "").upper() == "TRASLADO":
        asunto = "Se autoriza el traslado del equipo detallado a la nueva ubicación asignada."
    elif (acta.operacion_tipo or "").upper() == "PRESTAMO":
        asunto = "Se autoriza la salida temporal del equipo detallado en calidad de préstamo."
        if cuerpo.get("destino_persona"):
            asunto += f" Beneficiario: {cuerpo['destino_persona']}."
    elif (acta.operacion_tipo or "").upper() == "MANTENIMIENTO":
        asunto = "Registro del mantenimiento ejecutado al equipo detallado."
    elif (acta.operacion_tipo or "").upper() == "BAJA":
        asunto = "Acta de baja del equipo detallado."
    elif (acta.operacion_tipo or "").upper() == "ENTRADA":
        asunto = "Se registra la entrada a inventario del detalle relacionado."
    elif (acta.operacion_tipo or "").upper() == "SALIDA":
        asunto = "Por medio de la presente se autoriza la salida de inventario del detalle relacionado."
        if cuerpo.get("destino_persona"):
            asunto += f" Destino: {cuerpo['destino_persona']}."
    elif (acta.operacion_tipo or "").upper() in ("INSTALACION", "REUBICACION", "SOPORTE_SITIO", "RETIRO"):
        asunto = "Registro del servicio técnico ejecutado en sitio por el área de sistemas."
    else:
        asunto = "Por medio de la presente se autoriza la gestión del equipo detallado."

    es_stock = (acta.operacion_tipo or "").upper() in ("ENTRADA", "SALIDA")
    numero_display = re.sub(r"^([A-Za-z]+)-0+(\d+)$", r"\1-\2", acta.numero or "")

    elementos: list = []

    # ---------------------------------------------------------------- encabezado
    izq = Table(
        [
            [Paragraph(p.get("empresa_nombre", "SISTEMAS BOGOTÁ"), st_empresa)],
            [Paragraph(p.get("empresa_comercial", "ETICOS BOGOTÁ"), st_comercial)],
            [Paragraph(f'NIT: {p.get("empresa_nit", "892300678-7")}', st_dato)],
            [Paragraph(f'TEL: {p.get("empresa_telefono", "")}', st_dato)],
            [Paragraph(p.get("empresa_direccion", ""), st_dato)],
        ],
        colWidths=[9 * cm],
    )
    izq.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0)]))

    lista_datos = [
        [Paragraph(f"<b>{titulo}</b>", st_titulo_doc)],
        [Paragraph("N° " + numero_display, st_num)],
        [Paragraph(f'<b>FECHA:</b> {fecha_str}', st_dato)],
        [Paragraph(f'<b>CIUDAD:</b> {p.get("empresa_ciudad", "BOGOTÁ")}', st_dato)],
    ]
    if cuerpo.get("documento"):
        lista_datos.append([Paragraph(f'<b>DOC:</b> {cuerpo["documento"]}', st_dato)])
    der = Table(lista_datos, colWidths=[7.5 * cm])
    der.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, _BORDER),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f2f3ff")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )

    cabeza = Table([[izq, der]], colWidths=[9 * cm, 7.5 * cm])
    cabeza.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    elementos.append(cabeza)
    elementos.append(Spacer(1, 0.25 * cm))
    elementos.append(HRFlowable(width="100%", thickness=1.4, color=colors.HexColor("#1a1a4e")))
    elementos.append(Spacer(1, 0.35 * cm))

    # ---------------------------------------------------------------- destino / cuerpo
    destino_texto = cuerpo.get("destino_nombre") or p.get("destino_nombre", "")
    elementos.append(Paragraph(f'<b>DESTINO: </b>{destino_texto}', st_p))
    elementos.append(Paragraph(f'<b>ENCARGADO: </b>{p.get("encargado_nombre", "")} ({p.get("encargado_cargo", "")})', st_p))
    elementos.append(Spacer(1, 0.25 * cm))
    elementos.append(Paragraph(asunto, st_p))
    if cuerpo.get("motivo"):
        elementos.append(Paragraph(f"<b>Motivo:</b> {cuerpo['motivo']}", st_p))
    elementos.append(Spacer(1, 0.3 * cm))

    # ---------------------------------------------------------------- tabla dispositivos
    encabezados = ["DISPOSITIVO", "MARCA", "DETALLE", "CANT", "SERIAL"]
    filas = [[Paragraph(h, st_tdh) for h in encabezados]]
    for fila in tabla_datos:
        filas.append([Paragraph(c, st_td) for c in fila])
    tabla = Table(filas, colWidths=[4.2 * cm, 4.0 * cm, 4.2 * cm, 1.6 * cm, 4.2 * cm], repeatRows=1)
    tabla.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a4e")),
                ("GRID", (0, 0), (-1, -1), 0.7, _BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elementos.append(tabla)
    elementos.append(Spacer(1, 0.3 * cm))

    # ---------------------------------------------------------------- observaciones / valores
    valor_aprox = cuerpo.get("valor") or " ______________________ "
    f_val = Table(
        [
            [Paragraph(f"<b>VALOR APROX.</b>", st_obs), Paragraph(valor_aprox, st_obs), Paragraph("<b>CAJAS:</b> ________________", st_obs)],
        ],
        colWidths=[3.2 * cm, 6.6 * cm, 6.4 * cm],
    )
    f_val.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    elementos.append(f_val)
    elementos.append(Spacer(1, 0.35 * cm))

    # ---------------------------------------------------------------- observaciones adicional de resultado
    if cuerpo.get("resultado"):
        elementos.append(Paragraph(f"<b>RESULTADO / SOLUCIÓN:</b> {cuerpo['resultado']}", st_obs))
        elementos.append(Spacer(1, 0.3 * cm))

    # ---------------------------------------------------------------- detalle formal del servicio (mantenimiento)
    es_mantenimiento = (acta.tipo or "").upper() == "MANTENIMIENTO" or (acta.operacion_tipo or "").upper() == "MANTENIMIENTO"
    if es_mantenimiento:
        st_sec_titulo = ParagraphStyle("sec_t", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=colors.HexColor("#1a1a4e"))
        filas_servicio: list = []
        g = lambda v: v if v is not None else ""

        if getattr(op, "tipo", None):
            filas_servicio.append([Paragraph("<b>TIPO DE MANTENIMIENTO:</b>", st_obs), Paragraph(g(op.tipo), st_obs)])
        if getattr(op, "proposito", None):
            filas_servicio.append([Paragraph("<b>PROPÓSITO:</b>", st_obs), Paragraph(g(op.proposito), st_obs)])
        if getattr(op, "diagnostico", None):
            filas_servicio.append([Paragraph("<b>DIAGNÓSTICO PREVIO:</b>", st_obs), Paragraph(g(op.diagnostico), st_obs)])
        if getattr(op, "actividades", None):
            filas_servicio.append([Paragraph("<b>ACTIVIDADES REALIZADAS:</b>", st_obs), Paragraph(g(op.actividades), st_obs)])
        if getattr(op, "costo", None):
            filas_servicio.append([Paragraph("<b>COSTO DEL SERVICIO:</b>", st_obs), Paragraph(f"$ {float(op.costo):,.0f}", st_obs)])
        if getattr(op, "proxima_fecha", None):
            pf = op.proxima_fecha
            if getattr(pf, "astimezone", None):
                pf = pf.astimezone()
            filas_servicio.append([Paragraph("<b>PRÓXIMO MANTENIMIENTO:</b>", st_obs), Paragraph(pf.strftime("%d/%m/%Y"), st_obs)])

        if filas_servicio:
            elementos.append(Paragraph("DETALLE DEL SERVICIO REALIZADO", st_sec_titulo))
            elementos.append(Spacer(1, 0.12 * cm))
            t_servicio = Table(filas_servicio, colWidths=[5.4 * cm, 11.0 * cm])
            t_servicio.setStyle(
                TableStyle(
                    [
                        ("GRID", (0, 0), (-1, -1), 0.5, _BORDER),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 5),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f2f3ff")),
                    ]
                )
            )
            elementos.append(t_servicio)
            elementos.append(Spacer(1, 0.35 * cm))

        if getattr(op, "observaciones", None):
            elementos.append(Paragraph(f"<b>OBSERVACIONES:</b> {op.observaciones}", st_obs))
            elementos.append(Spacer(1, 0.3 * cm))

        fotos = _fotos_mantenimiento(db, op) if getattr(op, "acta_con_fotos", True) else None
        if fotos:
            elementos.append(Paragraph("REGISTRO FOTOGRÁFICO DEL EQUIPO ATENDIDO", st_sec_titulo))
            elementos.append(Paragraph("Fotografías de referencia tomadas durante el mantenimiento, identificadas por serial.", st_obs))
            elementos.append(Spacer(1, 0.2 * cm))
            grilla = _seccion_fotos(fotos, st_obs)
            if grilla is not None:
                elementos.append(grilla)
            elementos.append(Spacer(1, 0.35 * cm))

    # ---------------------------------------------------------------- firmas
    if es_stock:
        f_datos = [
            ["FIRMA ENTREGADO POR", "FIRMA RECIBIDO POR"],
            ["C.C. ______________________", "C.C. ______________________"],
            [
                p.get("encargado_nombre", "") + " - " + p.get("encargado_cargo", ""),
                destino_texto,
            ],
        ]
        f_cols = [8.5 * cm, 8.5 * cm]
    else:
        f_datos = [
            ["FIRMA ENTREGADO POR", "FIRMA RECIBIDO POR", "Vo.Bo."],
            ["C.C. ______________________", "C.C. ______________________", "C.C. ______________________"],
            [p.get("encargado_nombre", "") + " - " + p.get("encargado_cargo", ""), p.get("destino_nombre", ""), p.get("destino_nombre", "")],
        ]
        f_cols = [5.6 * cm, 5.6 * cm, 5.6 * cm]
    f_tabla = Table(
        [[Paragraph(f"<b>{c}</b>", st_firma) for c in f_datos[0]]]
        + [[Paragraph(c, st_firma) for c in fila] for fila in f_datos[1:]],
        colWidths=f_cols,
    )
    f_tabla.setStyle(
        TableStyle(
            [
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("LINEABOVE", (0, -2), (-1, -2), 0.7, _BORDER),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2f3ff")),
            ]
        )
    )
    elementos.append(f_tabla)

    # ---------------------------------------------------------------- página 2: etiqueta de caja (prototipo)
    if es_stock:
        elementos.append(PageBreak())
        pref_caja = "SAL." if (acta.operacion_tipo or "").upper() == "SALIDA" else "ENT."
        st_caja_titulo = ParagraphStyle("caja_t", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=20, leading=24, alignment=TA_CENTER, textColor=colors.HexColor("#0a4f95"))
        st_caja_row = ParagraphStyle("caja_r", parent=estilos["Normal"], fontSize=11, leading=16, alignment=TA_CENTER)
        caja = Table(
            [
                [Paragraph("CAJA 1/1", st_caja_titulo)],
                [Paragraph(f"<b>{pref_caja} # {numero_display}</b>", st_caja_row)],
                [Paragraph(f"<b>PARA:</b> {destino_texto or 'No especificado'}", st_caja_row)],
                [Paragraph(f"<b>DE:</b> {p.get('empresa_nombre', 'ETICOS')} - {p.get('empresa_ciudad', '')}", st_caja_row)],
            ],
            colWidths=[15 * cm],
        )
        caja.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 1.2, colors.HexColor("#0a4f95")),
                    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#e9f2fc")),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        elementos.append(Spacer(1, 2 * cm))
        elementos.append(caja)

    # ---------------------------------------------------------------- pie de página
    def on_page(canvas, documento):
        canvas.saveState()
        canvas.setStrokeColor(_BORDER)
        canvas.setLineWidth(0.6)
        canvas.line(1.8 * cm, 1.25 * cm, letter[0] - 1.8 * cm, 1.25 * cm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(_GRAY)
        canvas.drawString(1.8 * cm, 1.0 * cm, p.get("empresa_nombre", "ETICOS") + " · " + p.get("empresa_direccion", ""))
        canvas.drawRightString(letter[0] - 1.8 * cm, 1.0 * cm, f"Pag. {canvas.getPageNumber()}")
        canvas.restoreState()

    # ---------------------------------------------------------------- segunda página si hay mucho contenido (espacio de firmas opcional)
    # Se deja todo en una sola página; en caso de overflow reportlab crea páginas nuevas automáticamente.
    doc.build(elementos, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()


def generar_acta(db, acta, op) -> str:
    """Genera el PDF del acta, lo persiste y devuelve la ruta relativa."""
    from app.services import files_service as fs

    t = (acta.tipo or "").upper()
    ot = (acta.operacion_tipo or "").upper()
    if t == "MANTENIMIENTO" or ot == "MANTENIMIENTO":
        pdf = _render_mantenimiento(acta, op, db)
    elif t in ("INSTALACION", "REUBICACION", "SOPORTE_SITIO", "RETIRO") or ot in ("INSTALACION", "REUBICACION", "SOPORTE_SITIO", "RETIRO"):
        pdf = _render_instalacion(acta, op, db)
    else:
        pdf = _render(acta, op, db)
    ruta = fs.guardar_pdf(pdf, acta.numero or f"ACT-{acta.id}")
    return ruta


def leer_acta_pdf(ruta: str | None):
    return files_service.leer_pdf(ruta) if ruta else None