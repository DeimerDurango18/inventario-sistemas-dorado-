"""Modelos de activos TI: ficha técnica, atributos dinámicos y responsable actual."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Responsable(Base):
    __tablename__ = "responsables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    documento: Mapped[str | None] = mapped_column(String(30), index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    cargo: Mapped[str | None] = mapped_column(String(100))
    telefono: Mapped[str | None] = mapped_column(String(30))
    correo: Mapped[str | None] = mapped_column(String(150))
    sede_id: Mapped[int | None] = mapped_column(ForeignKey("sedes.id"))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Activo(Base):
    __tablename__ = "activos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), server_default="EQUIPO", index=True, nullable=False)
    codigo_inventario: Mapped[str | None] = mapped_column(String(50), index=True)
    placa: Mapped[str | None] = mapped_column(String(50), index=True)
    serial: Mapped[str | None] = mapped_column(String(100), index=True)
    qr_hash: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)

    marca_id: Mapped[int | None] = mapped_column(ForeignKey("marcas.id"))
    modelo_id: Mapped[int | None] = mapped_column(ForeignKey("modelos.id"))
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id"))
    subcategoria_id: Mapped[int | None] = mapped_column(ForeignKey("subcategorias.id"))
    estado_id: Mapped[int] = mapped_column(ForeignKey("estados_activo.id"), nullable=False, index=True)
    cantidad_stock: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)

    fecha_adquisicion: Mapped[datetime | None] = mapped_column(DateTime)
    fecha_ingreso: Mapped[datetime | None] = mapped_column(DateTime)
    proveedor_id: Mapped[int | None] = mapped_column(ForeignKey("proveedores.id"))
    factura_numero: Mapped[str | None] = mapped_column(String(50))
    valor_adquisicion: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    garantia_meses: Mapped[int | None] = mapped_column(Integer)
    fecha_fin_garantia: Mapped[datetime | None] = mapped_column(DateTime)

    responsable_id: Mapped[int | None] = mapped_column(ForeignKey("responsables.id"), index=True)
    ubicacion_id: Mapped[int | None] = mapped_column(ForeignKey("ubicaciones.id"), index=True)

    observaciones: Mapped[str | None] = mapped_column(Text)
    foto: Mapped[str | None] = mapped_column(String(300))

    activo: Mapped[bool] = mapped_column(Boolean, default=True, name="activo")
    creado_por: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    marca: Mapped["Marca"] = relationship(lazy="joined")
    modelo: Mapped["Modelo"] = relationship(lazy="joined")
    categoria: Mapped["Categoria"] = relationship(lazy="joined")
    subcategoria: Mapped["Subcategoria"] = relationship(lazy="joined")
    estado: Mapped["EstadoActivo"] = relationship(lazy="joined")
    responsable: Mapped["Responsable"] = relationship(lazy="joined")
    ubicacion: Mapped["Ubicacion"] = relationship(lazy="joined")
    proveedor: Mapped["Proveedor"] = relationship(lazy="joined")

    atributos_valores: Mapped[list["ActivoAtributo"]] = relationship(back_populates="activo", lazy="selectin")


class ActivoAtributo(Base):
    __tablename__ = "activo_atributos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    activo_id: Mapped[int] = mapped_column(ForeignKey("activos.id"), nullable=False)
    atributo_definicion_id: Mapped[int] = mapped_column(ForeignKey("atributo_definiciones.id"), nullable=False)
    valor: Mapped[str | None] = mapped_column(String(500))

    activo: Mapped["Activo"] = relationship(back_populates="atributos_valores")
    definicion: Mapped["AtributoDefinicion"] = relationship(lazy="joined")