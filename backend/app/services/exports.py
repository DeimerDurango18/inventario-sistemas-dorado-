"""Exportación a CSV y Excel (XLSX) de datos de inventario y reportes."""
import io

from openpyxl import Workbook


def _filas_equipos(equipos) -> list:
    filas = []
    for e in equipos:
        filas.append(
            {
                "Folio": e.folio,
                "Marca": e.marca,
                "Modelo": e.modelo,
                "Serie": e.serie or "",
                "Estado": e.estado,
                "Ubicacion": (e.ubicacion_rel.nombre if e.ubicacion_rel else e.ubicacion) or "",
                "Categoria": e.categoria.nombre if e.categoria else "",
                "Valor Aprox": float(e.valor_aprox) if e.valor_aprox is not None else None,
                "Observaciones": e.observaciones or "",
            }
        )
    return filas


def _filas_actas(actas) -> list:
    filas = []
    for a in actas:
        filas.append(
            {
                "Numero": a.numero,
                "Tipo": a.tipo,
                "Entregado Por": a.entregado_por,
                "Proyecto": a.proyecto or "",
                "Responsable Destino": a.responsable_destino or "",
                "Ciudad Destino": a.ciudad_destino or "",
                "Direccion Destino": a.direccion_destino or "",
                "Valor Aprox": float(a.valor_aprox) if a.valor_aprox is not None else None,
                "Cajas": a.cajas,
                "Fecha": a.created_at.isoformat() if a.created_at else "",
            }
        )
    return filas


def _filas_mantenimientos(registros) -> list:
    filas = []
    for r in registros:
        filas.append(
            {
                "Equipo Folio": r.equipo.folio if r.equipo else "",
                "Tipo": r.tipo,
                "Descripcion": r.descripcion or "",
                "Tecnico": r.tecnico or "",
                "Costo": float(r.costo) if r.costo is not None else None,
                "Estado": r.estado,
                "Fecha Programada": r.fecha_programada.isoformat() if r.fecha_programada else "",
            }
        )
    return filas


def exportar_csv(filas: list) -> bytes:
    """Genera un CSV (UTF-8 con BOM para Excel) a partir de una lista de dicts."""
    if not filas:
        return b""
    columnas = list(filas[0].keys())
    buf = io.StringIO()
    buf.write("\ufeff")  # BOM para que Excel detecte UTF-8
    buf.write(",".join(columnas))
    buf.write("\n")
    for fila in filas:
        celdas = []
        for col in columnas:
            valor = fila.get(col, "")
            if valor is None:
                valor = ""
            texto = str(valor)
            celdas.append(f'"{texto.replace(chr(34), chr(34)+chr(34))}"')
        buf.write(",".join(celdas))
        buf.write("\n")
    return buf.getvalue().encode("utf-8")


def exportar_xlsx(filas: list) -> bytes:
    """Genera un archivo XLSX a partir de una lista de dicts."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Reporte"
    if filas:
        columnas = list(filas[0].keys())
        ws.append(columnas)
        for fila in filas:
            ws.append([fila.get(col, "") for col in columnas])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()
