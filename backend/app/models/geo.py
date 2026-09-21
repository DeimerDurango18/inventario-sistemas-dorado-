"""Modelos geográficos y de operación nacional: país, departamento, ciudad, sede y ubicación."""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Pais(Base):
    __tablename__ = "paises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    departamentos: Mapped[list["Departamento"]] = relationship(back_populates="pais", lazy="selectin")


class Departamento(Base):
    __tablename__ = "departamentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pais_id: Mapped[int] = mapped_column(ForeignKey("paises.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)

    pais: Mapped["Pais"] = relationship(back_populates="departamentos")
    ciudades: Mapped[list["Ciudad"]] = relationship(back_populates="departamento", lazy="selectin")


class Ciudad(Base):
    __tablename__ = "ciudades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    departamento_id: Mapped[int] = mapped_column(ForeignKey("departamentos.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)

    departamento: Mapped["Departamento"] = relationship(back_populates="ciudades")
    sedes: Mapped[list["Sede"]] = relationship(back_populates="ciudad", lazy="selectin")


class TipoUbicacion(Base):
    __tablename__ = "tipos_ubicacion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Sede(Base):
    __tablename__ = "sedes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    ciudad_id: Mapped[int] = mapped_column(ForeignKey("ciudades.id"), nullable=False)
    tipo_ubicacion_id: Mapped[int | None] = mapped_column(ForeignKey("tipos_ubicacion.id"))
    direccion: Mapped[str | None] = mapped_column(String(255))
    telefono: Mapped[str | None] = mapped_column(String(30))
    responsable: Mapped[str | None] = mapped_column(String(150))
    estado: Mapped[str] = mapped_column(String(30), default="ACTIVA")
    ced_id: Mapped[int | None] = mapped_column(ForeignKey("sedes.id"))
    observaciones: Mapped[str | None] = mapped_column(Text)

    ciudad: Mapped["Ciudad"] = relationship(back_populates="sedes")
    tipo_ubicacion: Mapped["TipoUbicacion"] = relationship()
    centros_distribucion: Mapped[list["Sede"]] = relationship(
        back_populates="centro_distribucion", remote_side="Sede.id"
    )
    centro_distribucion: Mapped["Sede | None"] = relationship(
        foreign_keys=[ced_id], remote_side=[id]
    )
    ubicaciones: Mapped[list["Ubicacion"]] = relationship(back_populates="sede", lazy="selectin")


class Ubicacion(Base):
    __tablename__ = "ubicaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    sede_id: Mapped[int | None] = mapped_column(ForeignKey("sedes.id"), index=True)
    tipo_ubicacion_id: Mapped[int | None] = mapped_column(ForeignKey("tipos_ubicacion.id"))
    es_activa: Mapped[bool] = mapped_column(Boolean, default=True)
    observaciones: Mapped[str | None] = mapped_column(Text)

    sede: Mapped["Sede | None"] = relationship(back_populates="ubicaciones")
    tipo_ubicacion: Mapped["TipoUbicacion | None"] = relationship()