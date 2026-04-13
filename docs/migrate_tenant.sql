-- ── Paso 1: Agregar columnas nuevas a Usuarios ───────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'Foto')
    ALTER TABLE Usuarios ADD Foto NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'UnidadNegocioNombre')
    ALTER TABLE Usuarios ADD UnidadNegocioNombre NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'UltimoAcceso')
    ALTER TABLE Usuarios ADD UltimoAcceso DATETIME2 NOT NULL DEFAULT GETUTCDATE();

-- ── Paso 2: Crear el nuevo tenant (gmail.com) ────────────────
IF NOT EXISTS (SELECT 1 FROM Tenants WHERE Id = '591bfe88-c880-df96-85d3-e298cac22716')
    INSERT INTO Tenants (Id, Nombre, [Plan], Activo, CreadoEn, ActualizadoEn)
    VALUES ('591bfe88-c880-df96-85d3-e298cac22716', 'gmail.com', 'Basic', 1, GETUTCDATE(), GETUTCDATE());

-- ── Paso 3: Migrar datos al nuevo TenantId ───────────────────
UPDATE Solicitudes     SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';
UPDATE Comentarios     SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';
UPDATE Usuarios        SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';
UPDATE Categorias      SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';
UPDATE UnidadesNegocio SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';

IF OBJECT_ID('Archivos') IS NOT NULL
    UPDATE Archivos SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';

-- ── Paso 4: Eliminar dev tenant ──────────────────────────────
DELETE FROM Tenants WHERE Id = '00000000-0000-0000-0000-000000000002';

-- ── Verificar resultado ──────────────────────────────────────
SELECT 'Tenants'          AS Tabla, COUNT(*) AS Filas FROM Tenants
UNION ALL
SELECT 'Usuarios',        COUNT(*) FROM Usuarios        WHERE TenantId = '591bfe88-c880-df96-85d3-e298cac22716'
UNION ALL
SELECT 'Solicitudes',     COUNT(*) FROM Solicitudes     WHERE TenantId = '591bfe88-c880-df96-85d3-e298cac22716'
UNION ALL
SELECT 'Categorias',      COUNT(*) FROM Categorias      WHERE TenantId = '591bfe88-c880-df96-85d3-e298cac22716'
UNION ALL
SELECT 'UnidadesNegocio', COUNT(*) FROM UnidadesNegocio WHERE TenantId = '591bfe88-c880-df96-85d3-e298cac22716';
