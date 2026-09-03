"""Generación de códigos QR para equipos (PNG en memoria)."""
import io

import qrcode
from qrcode import constants


def generar_qr_png(payload: str, box_size: int = 8, border: int = 2) -> bytes:
    """Devuelve el contenido binario de una imagen PNG con el QR del payload."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
