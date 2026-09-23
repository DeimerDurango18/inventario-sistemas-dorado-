"""Generación de actas PDF (formato ORDEN DE SALIDA / ORDEN DE ENTRADA, membrete ETICOS)."""

from __future__ import annotations

import io
import re
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
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
        if op.referencia_tipo == "ITEM" and op.item is not None:
            marca = op.item.marca.nombre if getattr(op.item.marca, "nombre", None) else ""
            modelo = op.item.modelo.nombre if getattr(op.item.modelo, "nombre", None) else ""
            detalle = op.item.nombre or ""
            if modelo:
                detalle += f" · {modelo}"
            return [[op.item.tipo or "ITEM", marca, detalle, str(op.cantidad), "—"]]
        if op.referencia_tipo == "ACTIVO" and op.activo is not None:
            a = op.activo
            marca = a.marca.nombre if getattr(a.marca, "nombre", None) else ""
            detalle = a.serial or (a.codigo_inventario or a.placa or a.codigo)
            return [[a.tipo or "", marca, detalle, str(op.cantidad), a.serial or "—"]]
    activo = None
    if op is not None and getattr(op, "activo", None):
        activo = op.activo
    elif getattr(acta, "activo", None):
        activo = acta.activo
    if activo is None:
        return [["", "", "", "", ""]]
    marca = activo.marca.nombre if getattr(activo.marca, "nombre", None) else (activo.tipo or "")
    return [
        [
            activo.tipo or "",
            marca,
            activo.serial or (activo.codigo_inventario or activo.placa or ""),
            "1",
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

    pdf = _render(acta, op, db)
    ruta = fs.guardar_pdf(pdf, acta.numero or f"ACT-{acta.id}")
    return ruta


def leer_acta_pdf(ruta: str | None):
    return files_service.leer_pdf(ruta) if ruta else None