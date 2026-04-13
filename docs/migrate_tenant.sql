-- ============================================================
-- MIGRACIÓN: Dev Tenant → Tenant real de gmail.com
--
-- Ejecutar en Azure Portal → SQL Database → Query Editor
-- ANTES de hacer login con el nuevo código desplegado.
--
-- Qué hace:
--   1. Agrega columnas nuevas a Usuarios (Foto, UnidadNegocioNombre, UltimoAcceso)
--   2. Crea el tenant real de gmail.com (591bfe88-...)
--   3. Mueve TODOS los datos del dev tenant al nuevo
--   4. Elimina el dev tenant
-- ============================================================

-- ── Paso 1: Agregar columnas nuevas a Usuarios ───────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'Foto')
    ALTER TABLE Usuarios ADD Foto NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'UnidadNegocioNombre')
    ALTER TABLE Usuarios ADD UnidadNegocioNombre NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'UltimoAcceso')
    ALTER TABLE Usuarios ADD UltimoAcceso DATETIME2 NOT NULL DEFAULT GETUTCDATE();

-- ── Paso 2: Crear el nuevo tenant (gmail.com) ────────────────
IF NOT EXISTS (SELECT 1 FROM Tenants WHERE Id = '591bfe88-c880-df96-85d3-e298cac22716')
    INSERT INTO Tenants (Id, Nombre, Plan, Activo, CreadoEn, ActualizadoEn)
    VALUES ('591bfe88-c880-df96-85d3-e298cac22716', 'gmail.com', 'Basic', 1, GETUTCDATE(), GETUTCDATE());

-- ── Paso 3: Migrar datos al nuevo TenantId ───────────────────
-- Deshabilitar constraints de FK temporalmente
ALTER TABLE Solicitudes     NOCHECK CONSTRAINT ALL;
ALTER TABLE Comentarios     NOCHECK CONSTRAINT ALL;
ALTER TABLE ArchivoAdjuntos NOCHECK CONSTRAINT ALL;
ALTER TABLE Usuarios        NOCHECK CONSTRAINT ALL;
ALTER TABLE Categorias      NOCHECK CONSTRAINT ALL;
ALTER TABLE UnidadesNegocio NOCHECK CONSTRAINT ALL;

-- Actualizar TenantId en todas las tablas
UPDATE Solicitudes     SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';
UPDATE Comentarios     SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';
UPDATE ArchivoAdjuntos SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';
UPDATE Usuarios        SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';
UPDATE Categorias      SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';
UPDATE UnidadesNegocio SET TenantId = '591bfe88-c880-df96-85d3-e298cac22716' WHERE TenantId = '00000000-0000-0000-0000-000000000002';

-- Actualizar también el TenantId en FK de Solicitudes (UsuarioCreadorId apunta a un Usuario que cambió de TenantId)
-- (No hay FK directa de TenantId en Solicitudes → UsuarioCreadorId, así que no se necesita)

-- Re-habilitar constraints
ALTER TABLE Solicitudes     CHECK CONSTRAINT ALL;
ALTER TABLE Comentarios     CHECK CONSTRAINT ALL;
ALTER TABLE ArchivoAdjuntos CHECK CONSTRAINT ALL;
ALTER TABLE Usuarios        CHECK CONSTRAINT ALL;
ALTER TABLE Categorias      CHECK CONSTRAINT ALL;
ALTER TABLE UnidadesNegocio CHECK CONSTRAINT ALL;

-- ── Paso 4: Eliminar dev tenant ──────────────────────────────
DELETE FROM Tenants WHERE Id = '00000000-0000-0000-0000-000000000002';

-- ── Paso 5: Actualizar Tenant.Id del dev tenant (alternativa si NOCHECK no funciona)
-- Si el paso 4 falla por constraints, usa esto en su lugar:
-- UPDATE Tenants SET Id = '591bfe88-c880-df96-85d3-e298cac22716' WHERE Id = '00000000-0000-0000-0000-000000000002';

-- ── Verificar resultado ──────────────────────────────────────
SELECT 'Tenants'        AS Tabla, COUNT(*) AS Filas FROM Tenants
UNION ALL
SELECT 'Usuarios',      COUNT(*) FROM Usuarios       WHERE TenantId = '591bfe88-c880-df96-85d3-e298cac22716'
UNION ALL
SELECT 'Solicitudes',   COUNT(*) FROM Solicitudes    WHERE TenantId = '591bfe88-c880-df96-85d3-e298cac22716'
UNION ALL
SELECT 'Categorias',    COUNT(*) FROM Categorias     WHERE TenantId = '591bfe88-c880-df96-85d3-e298cac22716'
UNION ALL
SELECT 'UnidadesNegocio', COUNT(*) FROM UnidadesNegocio WHERE TenantId = '591bfe88-c880-df96-85d3-e298cac22716';
