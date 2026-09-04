USE master;
GO

IF DB_ID('InventarioEquipos') IS NULL
BEGIN
    CREATE DATABASE InventarioEquipos;
END
GO

USE InventarioEquipos;
GO

IF OBJECT_ID('dbo.acta_items', 'U') IS NOT NULL DROP TABLE dbo.acta_items;
IF OBJECT_ID('dbo.actas', 'U') IS NOT NULL DROP TABLE dbo.actas;
IF OBJECT_ID('dbo.mantenimientos', 'U') IS NOT NULL DROP TABLE dbo.mantenimientos;
IF OBJECT_ID('dbo.movimientos', 'U') IS NOT NULL DROP TABLE dbo.movimientos;
IF OBJECT_ID('dbo.equipos', 'U') IS NOT NULL DROP TABLE dbo.equipos;
IF OBJECT_ID('dbo.categorias', 'U') IS NOT NULL DROP TABLE dbo.categorias;
IF OBJECT_ID('dbo.ubicaciones', 'U') IS NOT NULL DROP TABLE dbo.ubicaciones;
IF OBJECT_ID('dbo.usuarios', 'U') IS NOT NULL DROP TABLE dbo.usuarios;
GO

CREATE TABLE dbo.categorias (
    id INT IDENTITY(1,1) NOT NULL,
    nombre NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(255) NULL,
    created_at DATETIME2 NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_categorias PRIMARY KEY (id),
    CONSTRAINT UQ_categorias_nombre UNIQUE (nombre)
);
GO

CREATE TABLE dbo.ubicaciones (
    id INT IDENTITY(1,1) NOT NULL,
    nombre NVARCHAR(100) NOT NULL,
    ciudad NVARCHAR(100) NULL,
    direccion NVARCHAR(255) NULL,
    created_at DATETIME2 NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ubicaciones PRIMARY KEY (id),
    CONSTRAINT UQ_ubicaciones_nombre UNIQUE (nombre)
);
GO

CREATE TABLE dbo.usuarios (
    id INT IDENTITY(1,1) NOT NULL,
    nombre NVARCHAR(150) NOT NULL,
    correo NVARCHAR(150) NOT NULL,
    rol NVARCHAR(30) NULL DEFAULT 'operativo',
    activo BIT NULL DEFAULT 1,
    created_at DATETIME2 NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_usuarios PRIMARY KEY (id),
    CONSTRAINT UQ_usuarios_correo UNIQUE (correo)
);
GO

CREATE TABLE dbo.equipos (
    id INT IDENTITY(1,1) NOT NULL,
    folio NVARCHAR(50) NOT NULL,
    marca NVARCHAR(100) NOT NULL,
    modelo NVARCHAR(100) NOT NULL,
    serie NVARCHAR(100) NULL,
    estado NVARCHAR(50) NULL DEFAULT 'disponible',
    categoria_id INT NULL,
    ubicacion_id INT NULL,
    valor_aprox DECIMAL(14,2) NULL,
    observaciones NVARCHAR(255) NULL,
    created_at DATETIME2 NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_equipos PRIMARY KEY (id),
    CONSTRAINT UQ_equipos_folio UNIQUE (folio),
    CONSTRAINT FK_equipos_categoria FOREIGN KEY (categoria_id) REFERENCES dbo.categorias(id),
    CONSTRAINT FK_equipos_ubicacion FOREIGN KEY (ubicacion_id) REFERENCES dbo.ubicaciones(id)
);
GO

CREATE INDEX IX_equipos_folio ON dbo.equipos(folio);
GO

CREATE TABLE dbo.movimientos (
    id INT IDENTITY(1,1) NOT NULL,
    tipo NVARCHAR(20) NOT NULL,
    folio_acta NVARCHAR(50) NOT NULL,
    persona NVARCHAR(150) NULL,
    motivo NVARCHAR(255) NULL,
    equipo_id INT NOT NULL,
    created_at DATETIME2 NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_movimientos PRIMARY KEY (id),
    CONSTRAINT FK_movimientos_equipos FOREIGN KEY (equipo_id) REFERENCES dbo.equipos(id)
);
GO

CREATE INDEX IX_movimientos_folio_acta ON dbo.movimientos(folio_acta);
GO

CREATE INDEX IX_movimientos_equipo_id ON dbo.movimientos(equipo_id);
GO

CREATE TABLE dbo.mantenimientos (
    id INT IDENTITY(1,1) NOT NULL,
    equipo_id INT NOT NULL,
    tipo NVARCHAR(30) NULL DEFAULT 'preventivo',
    descripcion NVARCHAR(255) NULL,
    tecnico NVARCHAR(150) NULL,
    costo DECIMAL(12,2) NULL,
    estado NVARCHAR(30) NULL DEFAULT 'programado',
    fecha_programada DATETIME2 NULL,
    fecha_finalizado DATETIME2 NULL,
    created_at DATETIME2 NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_mantenimientos PRIMARY KEY (id),
    CONSTRAINT FK_mantenimientos_equipos FOREIGN KEY (equipo_id) REFERENCES dbo.equipos(id)
);
GO

-- Actas de salida/entrada: encabezado (actas) + detalle de dispositivos (acta_items)
CREATE TABLE dbo.actas (
    id INT IDENTITY(1,1) NOT NULL,
    numero NVARCHAR(30) NOT NULL,
    tipo NVARCHAR(10) NULL DEFAULT 'SALIDA',
    entregado_por NVARCHAR(150) NOT NULL,
    proyecto NVARCHAR(200) NULL,
    responsable_destino NVARCHAR(150) NULL,
    ciudad_destino NVARCHAR(100) NULL,
    direccion_destino NVARCHAR(200) NULL,
    observaciones NVARCHAR(MAX) NULL,
    valor_aprox DECIMAL(14,2) NULL,
    cajas INT NULL DEFAULT 1,
    pdf_path NVARCHAR(300) NULL,
    created_at DATETIME2 NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_actas PRIMARY KEY (id),
    CONSTRAINT UQ_actas_numero UNIQUE (numero)
);
GO

CREATE TABLE dbo.acta_items (
    id INT IDENTITY(1,1) NOT NULL,
    acta_id INT NOT NULL,
    equipo_id INT NULL,
    dispositivo NVARCHAR(100) NOT NULL,
    marca NVARCHAR(100) NULL,
    detalle NVARCHAR(150) NULL,
    cantidad INT NULL DEFAULT 1,
    serial NVARCHAR(100) NULL,
    CONSTRAINT PK_acta_items PRIMARY KEY (id),
    CONSTRAINT FK_acta_items_actas FOREIGN KEY (acta_id) REFERENCES dbo.actas(id) ON DELETE CASCADE,
    CONSTRAINT FK_acta_items_equipos FOREIGN KEY (equipo_id) REFERENCES dbo.equipos(id)
);
GO

CREATE INDEX IX_acta_items_acta_id ON dbo.acta_items(acta_id);
GO

SELECT 'Base creada y tablas listas' AS status;
GO
