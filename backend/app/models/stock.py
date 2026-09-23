"""Modelos del módulo de stock: ítems agregados y movimientos de entrada/salida/ajuste."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class StockItem(Base):
    """Ítem agregado de inventario (tipo/marca/modelo) con existencias propias."""

    __tablename__ = "stock_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), server_default="EQUIPO", nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(50), index=True)
    marca_id: Mapped[int | None] = mapped_column(ForeignKey("marcas.id"))
    modelo_id: Mapped[int | None] = mapped_column(ForeignKey("modelos.id"))
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id"))
    cantidad_stock: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    stock_minimo: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    valor_unitario: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    marca: Mapped["Marca | None"] = relationship(lazy="joined")
    modelo: Mapped["Modelo | None"] = relationship(lazy="joined")
    categoria: Mapped["Categoria | None"] = relationship(lazy="joined")
    ubicaciones: Mapped[list["StockItemUbicacion"]] = relationship(
        back_populates="item",
        lazy="joined",
        cascade="all, delete-orphan",
        order_by=lambda: StockItemUbicacion.ubicacion_id,
    )

    @property
    def valor_total(self) -> float:
        return float((self.valor_unitario or 0) * self.cantidad_stock)


class StockItemUbicacion(Base):
    """Existencias de un ítem agregado por ubicación (bodegas/sedes)."""

    __tablename__ = "stock_items_ubicaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("stock_items.id"), nullable=False)
    ubicacion_id: Mapped[int] = mapped_column(ForeignKey("ubicaciones.id"), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)

    item: Mapped["StockItem"] = relationship(back_populates="ubicaciones")
    ubicacion: Mapped["Ubicacion"] = relationship(lazy="joined")

    __table_args__ = (UniqueConstraint("item_id", "ubicacion_id", name="uq_stock_item_ubicacion"),)


class MovimientoStock(Base):
    """Ledger de entradas y salidas de stock. Nunca se borra: se anula y revierte la existencia."""

    __tablename__ = "movimientos_stock"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(30), nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # ENTRADA | SALIDA | AJUSTE
    referencia_tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # ITEM | ACTIVO
    item_id: Mapped[int | None] = mapped_column(ForeignKey("stock_items.id"))
    activo_id: Mapped[int | None] = mapped_column(ForeignKey("activos.id"))
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    proveedor_id: Mapped[int | None] = mapped_column(ForeignKey("proveedores.id"))
    documento: Mapped[str | None] = mapped_column(String(100))  # factura / remisión / cliente
    destino: Mapped[str | None] = mapped_column(String(200))  # destino de la salida
    valor: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    ubicacion_id: Mapped[int | None] = mapped_column(ForeignKey("ubicaciones.id"))  # bodega/sede
    nuevo_stock: Mapped[int | None] = mapped_column(Integer)  # ajuste: existencia final
    stock_anterior: Mapped[int | None] = mapped_column(Integer)  # ajuste: existencia previa
    motivo: Mapped[str | None] = mapped_column(String(255))
    observaciones: Mapped[str | None] = mapped_column(String(1000))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), server_default="REGISTRADO", nullable=False)
    anulado_motivo: Mapped[str | None] = mapped_column(String(255))
    anulado_usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    anulado_fecha: Mapped[datetime | None] = mapped_column(DateTime)
    acta_id: Mapped[int | None] = mapped_column(ForeignKey("actas.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    item: Mapped["StockItem | None"] = relationship(lazy="joined")
    activo: Mapped["Activo | None"] = relationship(lazy="joined")
    proveedor: Mapped["Proveedor | None"] = relationship(lazy="joined")
    ubicacion: Mapped["Ubicacion | None"] = relationship(lazy="joined")
    usuario: Mapped["Usuario"] = relationship(foreign_keys=[usuario_id], lazy="joined")