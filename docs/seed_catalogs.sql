-- ============================================================
-- SEED: Categorías y Unidades de Negocio
-- TenantId: 591bfe88-c880-df96-85d3-e298cac22716  (gmail.com)
-- Pegar en Azure Portal → SQL Database → Query Editor
-- ============================================================

-- ── Categorías ──────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Infraestructura')
    INSERT INTO Categorias (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Infraestructura', '#3b82f6', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Categorias WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Soporte TI')
    INSERT INTO Categorias (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Soporte TI', '#06b6d4', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Categorias WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Recursos Humanos')
    INSERT INTO Categorias (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Recursos Humanos', '#10b981', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Categorias WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Finanzas')
    INSERT INTO Categorias (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Finanzas', '#f59e0b', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Categorias WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Legal')
    INSERT INTO Categorias (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Legal', '#8b5cf6', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Categorias WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Marketing')
    INSERT INTO Categorias (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Marketing', '#ec4899', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Categorias WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Operaciones')
    INSERT INTO Categorias (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Operaciones', '#f97316', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Categorias WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Seguridad')
    INSERT INTO Categorias (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Seguridad', '#ef4444', 1, GETUTCDATE(), GETUTCDATE());

-- ── Unidades de Negocio ─────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM UnidadesNegocio WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Tecnologia')
    INSERT INTO UnidadesNegocio (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Tecnología', '#3b82f6', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM UnidadesNegocio WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Recursos Humanos')
    INSERT INTO UnidadesNegocio (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Recursos Humanos', '#10b981', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM UnidadesNegocio WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Finanzas')
    INSERT INTO UnidadesNegocio (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Finanzas', '#f59e0b', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM UnidadesNegocio WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Operaciones')
    INSERT INTO UnidadesNegocio (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Operaciones', '#f97316', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM UnidadesNegocio WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Marketing')
    INSERT INTO UnidadesNegocio (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Marketing', '#ec4899', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM UnidadesNegocio WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Legal')
    INSERT INTO UnidadesNegocio (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Legal', '#8b5cf6', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM UnidadesNegocio WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Gerencia')
    INSERT INTO UnidadesNegocio (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Gerencia', '#0f172a', 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM UnidadesNegocio WHERE TenantId='00000000-0000-0000-0000-000000000002' AND Nombre='Logistica')
    INSERT INTO UnidadesNegocio (Id, TenantId, Nombre, Color, Activo, CreadoEn, ActualizadoEn)
    VALUES (NEWID(), '00000000-0000-0000-0000-000000000002', 'Logística', '#64748b', 1, GETUTCDATE(), GETUTCDATE());

-- ── Verificar ───────────────────────────────────────────────
SELECT 'Categorias' AS Tabla, COUNT(*) AS Total FROM Categorias WHERE TenantId='00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'UnidadesNegocio', COUNT(*) FROM UnidadesNegocio WHERE TenantId='00000000-0000-0000-0000-000000000002';
