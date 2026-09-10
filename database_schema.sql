-- ============================================================
-- ESQUEMA ACTUAL DE LA BASE DE DATOS InventarioEquipos
-- Generado automáticamente desde SQL Server (2026-09-07).
-- NOTA: la fuente de verdad es Alembic (backend/alembic).
-- ============================================================

CREATE TABLE [acta_items] (
[id] int IDENTITY(1,1) NOT NULL,
    [acta_id] int NOT NULL,
    [equipo_id] int NULL,
    [dispositivo] varchar(100) NOT NULL,
    [marca] varchar(100) NULL,
    [detalle] varchar(150) NULL,
    [cantidad] int NULL,
    [serial] varchar(100) NULL,
    [empresa_id] int NULL,
    CONSTRAINT [PK_acta_items] PRIMARY KEY ([id])
)

GO

CREATE TABLE [actas] (
[id] int IDENTITY(1,1) NOT NULL,
    [numero] varchar(30) NOT NULL,
    [tipo] varchar(10) NULL,
    [entregado_por] varchar(150) NOT NULL,
    [proyecto] varchar(200) NULL,
    [responsable_destino] varchar(150) NULL,
    [ciudad_destino] varchar(100) NULL,
    [direccion_destino] varchar(200) NULL,
    [observaciones] varchar(max) NULL,
    [valor_aprox] numeric(14,2) NULL,
    [cajas] int NULL,
    [pdf_path] varchar(300) NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    [empresa_id] int NULL,
    [firmado_por] varchar(150) NULL,
    [documento_firma] varchar(50) NULL,
    [fecha_firma] datetimeoffset NULL,
    [fotos] varchar(max) NULL,
    CONSTRAINT [PK_actas] PRIMARY KEY ([id])
)

GO

CREATE TABLE [adjuntos_equipos] (
[id] int IDENTITY(1,1) NOT NULL,
    [empresa_id] int NULL,
    [tipo] varchar(20) NOT NULL,
    [equipo_id] int NULL,
    [registro_id] int NULL,
    [ticket_id] int NULL,
    [archivo] varchar(300) NOT NULL,
    [descripcion] varchar(150) NULL,
    [creado_por] varchar(150) NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    CONSTRAINT [PK_adjuntos_equipos] PRIMARY KEY ([id])
)

GO

CREATE TABLE [alembic_version] (
[version_num] varchar(32) NOT NULL,
    CONSTRAINT [PK_alembic_version] PRIMARY KEY ([version_num])
)

GO

CREATE TABLE [atenciones_punto] (
[id] int IDENTITY(1,1) NOT NULL,
    [empresa_id] int NULL,
    [punto_id] int NOT NULL,
    [ticket_id] int NULL,
    [fecha] datetimeoffset NULL DEFAULT (getdate()),
    [tipo] varchar(30) NULL DEFAULT ('soporte'),
    [descripcion] varchar(max) NULL,
    [tecnico] varchar(150) NULL,
    [resultado] varchar(300) NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    CONSTRAINT [PK_atenciones_punto] PRIMARY KEY ([id])
)

GO

CREATE TABLE [audit_logs] (
[id] int IDENTITY(1,1) NOT NULL,
    [empresa_id] int NULL,
    [user_id] int NULL,
    [entity_type] varchar(50) NOT NULL,
    [entity_id] int NOT NULL,
    [action] varchar(20) NOT NULL,
    [changes] varchar(max) NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    CONSTRAINT [PK_audit_logs] PRIMARY KEY ([id])
)

GO

CREATE TABLE [categorias] (
[id] int IDENTITY(1,1) NOT NULL,
    [nombre] varchar(100) NOT NULL,
    [descripcion] varchar(255) NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    [empresa_id] int NULL,
    CONSTRAINT [PK_categorias] PRIMARY KEY ([id])
)

GO

CREATE TABLE [empresas] (
[id] int IDENTITY(1,1) NOT NULL,
    [nombre] varchar(200) NOT NULL,
    [nit] varchar(50) NULL,
    [telefono] varchar(50) NULL,
    [direccion] varchar(300) NULL,
    [logo_path] varchar(300) NULL,
    [activo] bit NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    CONSTRAINT [PK_empresas] PRIMARY KEY ([id])
)

GO

CREATE TABLE [equipos] (
[id] int IDENTITY(1,1) NOT NULL,
    [folio] varchar(50) NOT NULL,
    [marca] varchar(100) NOT NULL,
    [modelo] varchar(100) NOT NULL,
    [serie] varchar(100) NULL,
    [estado] varchar(50) NULL,
    [ubicacion] varchar(100) NULL,
    [categoria_id] int NULL,
    [ubicacion_id] int NULL,
    [valor_aprox] numeric(14,2) NULL,
    [observaciones] varchar(255) NULL,
    [foto] varchar(300) NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    [prestamo_a] varchar(150) NULL,
    [prestamo_desde] datetimeoffset NULL,
    [prestamo_hasta] datetimeoffset NULL,
    [baja_motivo] varchar(255) NULL,
    [precio_venta] numeric(14,2) NULL,
    [fecha_baja] datetimeoffset NULL,
    [empresa_id] int NULL,
    [fecha_compra] datetimeoffset NULL,
    [meses_garantia] int NULL,
    CONSTRAINT [PK_equipos] PRIMARY KEY ([id])
)

GO

CREATE TABLE [instalaciones] (
[id] int IDENTITY(1,1) NOT NULL,
    [empresa_id] int NULL,
    [punto_id] int NOT NULL,
    [equipo_id] int NOT NULL,
    [software] varchar(300) NULL,
    [fecha_instalacion] datetimeoffset NULL,
    [estado] varchar(20) NULL DEFAULT ('activa'),
    [observaciones] varchar(max) NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    CONSTRAINT [PK_instalaciones] PRIMARY KEY ([id])
)

GO

CREATE TABLE [mantenimientos] (
[id] int IDENTITY(1,1) NOT NULL,
    [equipo_id] int NOT NULL,
    [tipo] varchar(30) NULL,
    [descripcion] varchar(255) NULL,
    [tecnico] varchar(150) NULL,
    [prioridad] varchar(20) NOT NULL DEFAULT ('media'),
    [estado] varchar(30) NULL,
    [fecha_programada] datetimeoffset NULL,
    [fecha_finalizado] datetimeoffset NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    [foto] varchar(300) NULL,
    [piezas] varchar(max) NULL,
    [empresa_id] int NULL,
    [periodicidad] varchar(20) NULL,
    [punto_id] int NULL,
    CONSTRAINT [PK_mantenimientos] PRIMARY KEY ([id])
)

GO

CREATE TABLE [movimientos] (
[id] int IDENTITY(1,1) NOT NULL,
    [tipo] varchar(20) NOT NULL,
    [folio_acta] varchar(50) NULL,
    [persona] varchar(150) NULL,
    [motivo] varchar(255) NULL,
    [estado_anterior] varchar(50) NULL,
    [estado_nuevo] varchar(50) NULL,
    [equipo_id] int NOT NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    [empresa_id] int NULL,
    CONSTRAINT [PK_movimientos] PRIMARY KEY ([id])
)

GO

CREATE TABLE [puntos_venta] (
[id] int IDENTITY(1,1) NOT NULL,
    [empresa_id] int NULL,
    [nombre] varchar(200) NOT NULL,
    [tipo] varchar(30) NULL DEFAULT ('drogueria'),
    [ciudad] varchar(150) NULL,
    [direccion] varchar(300) NULL,
    [telefono] varchar(50) NULL,
    [responsable] varchar(150) NULL,
    [coordinador_celular] varchar(20) NULL,
    [estado] varchar(20) NULL DEFAULT ('activo'),
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    CONSTRAINT [PK_puntos_venta] PRIMARY KEY ([id])
)

GO

CREATE TABLE [tickets_soporte] (
[id] int IDENTITY(1,1) NOT NULL,
    [empresa_id] int NULL,
    [equipo_id] int NULL,
    [ubicacion_id] int NULL,
    [titulo] varchar(150) NOT NULL,
    [descripcion] varchar(max) NULL,
    [prioridad] varchar(20) NULL DEFAULT ('media'),
    [estado] varchar(20) NULL DEFAULT ('abierto'),
    [tecnico] varchar(150) NULL,
    [fecha_visita] datetimeoffset NULL,
    [fecha_resolucion] datetimeoffset NULL,
    [creado_por] varchar(150) NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    CONSTRAINT [PK_tickets_soporte] PRIMARY KEY ([id])
)

GO

CREATE TABLE [ubicaciones] (
[id] int IDENTITY(1,1) NOT NULL,
    [nombre] varchar(100) NOT NULL,
    [ciudad] varchar(100) NULL,
    [direccion] varchar(255) NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    [empresa_id] int NULL,
    CONSTRAINT [PK_ubicaciones] PRIMARY KEY ([id])
)

GO

CREATE TABLE [usuarios] (
[id] int IDENTITY(1,1) NOT NULL,
    [nombre] varchar(150) NOT NULL,
    [correo] varchar(150) NOT NULL,
    [password] varchar(255) NULL,
    [rol] varchar(30) NULL,
    [activo] bit NULL,
    [created_at] datetimeoffset NULL DEFAULT (getdate()),
    [empresa_id] int NULL,
    CONSTRAINT [PK_usuarios] PRIMARY KEY ([id])
)

GO

ALTER TABLE [acta_items] ADD CONSTRAINT [FK__acta_item__acta___5EBF139D] FOREIGN KEY ([acta_id]) REFERENCES [actas] ([id]);
GO

ALTER TABLE [acta_items] ADD CONSTRAINT [FK__acta_item__equip__5FB337D6] FOREIGN KEY ([equipo_id]) REFERENCES [equipos] ([id]);
GO

ALTER TABLE [acta_items] ADD CONSTRAINT [fk_acta_items_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [actas] ADD CONSTRAINT [fk_actas_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [adjuntos_equipos] ADD CONSTRAINT [fk_adjuntos_equipo] FOREIGN KEY ([equipo_id]) REFERENCES [equipos] ([id]);
GO

ALTER TABLE [adjuntos_equipos] ADD CONSTRAINT [fk_adjuntos_ticket] FOREIGN KEY ([ticket_id]) REFERENCES [tickets_soporte] ([id]);
GO

ALTER TABLE [atenciones_punto] ADD CONSTRAINT [fk_atenc_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [atenciones_punto] ADD CONSTRAINT [fk_atenc_punto] FOREIGN KEY ([punto_id]) REFERENCES [puntos_venta] ([id]);
GO

ALTER TABLE [atenciones_punto] ADD CONSTRAINT [fk_atenc_ticket] FOREIGN KEY ([ticket_id]) REFERENCES [tickets_soporte] ([id]);
GO

ALTER TABLE [audit_logs] ADD CONSTRAINT [fk_audit_logs_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [audit_logs] ADD CONSTRAINT [fk_audit_logs_usuario] FOREIGN KEY ([user_id]) REFERENCES [usuarios] ([id]);
GO

ALTER TABLE [categorias] ADD CONSTRAINT [fk_categorias_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [equipos] ADD CONSTRAINT [FK__equipos__categor__5AEE82B9] FOREIGN KEY ([categoria_id]) REFERENCES [categorias] ([id]);
GO

ALTER TABLE [equipos] ADD CONSTRAINT [FK__equipos__ubicaci__5BE2A6F2] FOREIGN KEY ([ubicacion_id]) REFERENCES [ubicaciones] ([id]);
GO

ALTER TABLE [equipos] ADD CONSTRAINT [fk_equipos_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [instalaciones] ADD CONSTRAINT [fk_inst_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [instalaciones] ADD CONSTRAINT [fk_inst_equipo] FOREIGN KEY ([equipo_id]) REFERENCES [equipos] ([id]);
GO

ALTER TABLE [instalaciones] ADD CONSTRAINT [fk_inst_punto] FOREIGN KEY ([punto_id]) REFERENCES [puntos_venta] ([id]);
GO

ALTER TABLE [mantenimientos] ADD CONSTRAINT [FK__mantenimi__equip__6383C8BA] FOREIGN KEY ([equipo_id]) REFERENCES [equipos] ([id]);
GO

ALTER TABLE [mantenimientos] ADD CONSTRAINT [fk_mant_punto] FOREIGN KEY ([punto_id]) REFERENCES [puntos_venta] ([id]);
GO

ALTER TABLE [mantenimientos] ADD CONSTRAINT [fk_mantenimientos_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [movimientos] ADD CONSTRAINT [FK__movimient__equip__6754599E] FOREIGN KEY ([equipo_id]) REFERENCES [equipos] ([id]);
GO

ALTER TABLE [movimientos] ADD CONSTRAINT [fk_movimientos_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [puntos_venta] ADD CONSTRAINT [fk_puntos_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [tickets_soporte] ADD CONSTRAINT [fk_tickets_equipo] FOREIGN KEY ([equipo_id]) REFERENCES [equipos] ([id]);
GO

ALTER TABLE [tickets_soporte] ADD CONSTRAINT [fk_tickets_ubicacion] FOREIGN KEY ([ubicacion_id]) REFERENCES [ubicaciones] ([id]);
GO

ALTER TABLE [ubicaciones] ADD CONSTRAINT [fk_ubicaciones_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO

ALTER TABLE [usuarios] ADD CONSTRAINT [fk_usuarios_empresa] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]);
GO
