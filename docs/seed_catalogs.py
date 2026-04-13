"""
seed_catalogs.py — Inserta Categorías y Unidades de Negocio de ejemplo
para el tenant gmail.com (kndpaulo@gmail.com).

Requiere: pip install pyodbc
Uso:      python docs/seed_catalogs.py
"""

import pyodbc
import uuid
import hashlib
from datetime import datetime, timezone

# ── Conexión ────────────────────────────────────────────────────────────────
SERVER   = "solicitudesapp-server.database.windows.net"
DATABASE = "SolicitudesAppDB"
USERNAME = "sqladmin"
PASSWORD = "Numero10*"   # <-- cambia esto

conn_str = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={SERVER};DATABASE={DATABASE};"
    f"UID={USERNAME};PWD={PASSWORD};"
    f"Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
)

# ── Helpers ──────────────────────────────────────────────────────────────────
def deterministic_guid(value: str) -> str:
    h = hashlib.sha256(value.encode("utf-8")).digest()[:16]
    return str(uuid.UUID(bytes=h))

TENANT_ID = deterministic_guid("gmail.com")
NOW = datetime.now(timezone.utc)

# ── Datos de ejemplo ─────────────────────────────────────────────────────────
CATEGORIAS = [
    ("Infraestructura",   "#3b82f6"),   # azul
    ("Soporte TI",        "#06b6d4"),   # cyan
    ("Recursos Humanos",  "#10b981"),   # verde
    ("Finanzas",          "#f59e0b"),   # ámbar
    ("Legal",             "#8b5cf6"),   # violeta
    ("Marketing",         "#ec4899"),   # rosa
    ("Operaciones",       "#f97316"),   # naranja
    ("Seguridad",         "#ef4444"),   # rojo
]

UNIDADES_NEGOCIO = [
    ("Tecnología",         "#3b82f6"),   # azul
    ("Recursos Humanos",   "#10b981"),   # verde
    ("Finanzas",           "#f59e0b"),   # ámbar
    ("Operaciones",        "#f97316"),   # naranja
    ("Marketing",          "#ec4899"),   # rosa
    ("Legal",              "#8b5cf6"),   # violeta
    ("Gerencia",           "#0f172a"),   # negro/slate
    ("Logística",          "#64748b"),   # gris
]

# ── Ejecución ─────────────────────────────────────────────────────────────────
def main():
    print(f"Conectando a {SERVER}...")
    with pyodbc.connect(conn_str) as cn:
        cur = cn.cursor()

        # Verificar que el tenant existe
        cur.execute("SELECT Id, Nombre FROM Tenants WHERE Id = ?", TENANT_ID)
        tenant = cur.fetchone()
        if not tenant:
            print(f"ERROR: No se encontró el tenant con Id={TENANT_ID}")
            print("Loguéate al menos una vez con tu cuenta Google para que se cree.")
            return
        print(f"Tenant encontrado: {tenant.Nombre} ({TENANT_ID})")

        # ── Categorías ─────────────────────────────────────────────────────
        print("\nInsertando categorías...")
        cat_ok = 0
        for nombre, color in CATEGORIAS:
            cur.execute(
                "SELECT COUNT(*) FROM Categorias WHERE TenantId = ? AND Nombre = ?",
                TENANT_ID, nombre
            )
            if cur.fetchone()[0] > 0:
                print(f"  [skip] {nombre} (ya existe)")
                continue

            cat_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO Categorias (Id, TenantId, Nombre, Color, Activo, CreadoEn)
                   VALUES (?, ?, ?, ?, 1, ?)""",
                cat_id, TENANT_ID, nombre, color, NOW
            )
            print(f"  [+] {nombre}  {color}")
            cat_ok += 1

        # ── Unidades de Negocio ────────────────────────────────────────────
        print("\nInsertando unidades de negocio...")
        bu_ok = 0
        for nombre, color in UNIDADES_NEGOCIO:
            cur.execute(
                "SELECT COUNT(*) FROM UnidadesNegocio WHERE TenantId = ? AND Nombre = ?",
                TENANT_ID, nombre
            )
            if cur.fetchone()[0] > 0:
                print(f"  [skip] {nombre} (ya existe)")
                continue

            bu_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO UnidadesNegocio (Id, TenantId, Nombre, Color, Activo, CreadoEn)
                   VALUES (?, ?, ?, ?, 1, ?)""",
                bu_id, TENANT_ID, nombre, color, NOW
            )
            print(f"  [+] {nombre}  {color}")
            bu_ok += 1

        cn.commit()
        print(f"\nListo: {cat_ok} categorías, {bu_ok} BUs insertadas.")


if __name__ == "__main__":
    main()
