"""Modelos de catálogos configurables: categorías, marcas, modelos, proveedores, estados y atributos."""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    subcategorias: Mapped[list["Subcategoria"]] = relationship(back_populates="categoria", lazy="selectin")


class Subcategoria(Base):
    __tablename__ = "subcategorias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    categoria_id: Mapped[int] = mapped_column(ForeignKey("categorias.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    categoria: Mapped["Categoria"] = relationship(back_populates="subcategorias")
    atributos: Mapped[list["AtributoDefinicion"]] = relationship(back_populates="subcategoria", lazy="selectin")


class Marca(Base):
    __tablename__ = "marcas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    modelos: Mapped[list["Modelo"]] = relationship(back_populates="marca", lazy="selectin")


class Modelo(Base):
    __tablename__ = "modelos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    marca_id: Mapped[int] = mapped_column(ForeignKey("marcas.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    marca: Mapped["Marca"] = relationship(back_populates="modelos")


class Proveedor(Base):
    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nit: Mapped[str | None] = mapped_column(String(30), index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    contacto: Mapped[str | None] = mapped_column(String(150))
    telefono: Mapped[str | None] = mapped_column(String(30))
    correo: Mapped[str | None] = mapped_column(String(150))
    direccion: Mapped[str | None] = mapped_column(String(255))
    ciudad_id: Mapped[int | None] = mapped_column(ForeignKey("ciudades.id"))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class EstadoActivo(Base):
    __tablename__ = "estados_activo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(60), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#6c757d")
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    transiciones: Mapped[list["TransicionEstado"]] = relationship(
        foreign_keys="TransicionEstado.estado_origen_id", back_populates="estado_origen", lazy="selectin"
    )


class TransicionEstado(Base):
    __tablename__ = "transiciones_estado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    estado_origen_id: Mapped[int] = mapped_column(ForeignKey("estados_activo.id"), nullable=False)
    estado_destino_id: Mapped[int] = mapped_column(ForeignKey("estados_activo.id"), nullable=False)
    operacion: Mapped[str] = mapped_column(String(40), nullable=False)

    estado_origen: Mapped["EstadoActivo"] = relationship(
        back_populates="transiciones", foreign_keys=[estado_origen_id]
    )
    estado_destino: Mapped["EstadoActivo"] = relationship(foreign_keys=[estado_destino_id])


class AtributoDefinicion(Base):
    __tablename__ = "atributo_definiciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subcategoria_id: Mapped[int] = mapped_column(ForeignKey("subcategorias.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    tipo_dato: Mapped[str] = mapped_column(String(20), default="texto")
    requerido: Mapped[bool] = mapped_column(Boolean, default=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    subcategoria: Mapped["Subcategoria"] = relationship(back_populates="atributos")