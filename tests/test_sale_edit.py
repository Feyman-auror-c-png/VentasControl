"""Run with: python -m unittest discover -s tests -v (uses a temporary database)."""
import os
import tempfile
import unittest

TEMP = tempfile.TemporaryDirectory()
os.environ["VENTAS_DB_PATH"] = os.path.join(TEMP.name, "test.db")
os.environ["VENTAS_UPLOADS_DIR"] = os.path.join(TEMP.name, "uploads")

from backend.database import get_db, init_db
from backend.main import VentaUpdate, actualizar_venta
from fastapi import HTTPException
from pydantic import ValidationError


class SaleEditTests(unittest.TestCase):
    def setUp(self):
        init_db()
        with get_db() as db:
            db.execute("DELETE FROM workspaces")
            db.execute("INSERT INTO workspaces(id,nombre) VALUES(1,'Test')")
            db.execute("INSERT INTO ventas(id,workspace_id,comprador_nombre,fecha_venta,total_gtq,estado) VALUES(1,1,'Original','2026-10-01',100,'activa')")
            db.execute("INSERT INTO abonos(venta_id,monto_gtq,fecha_abono) VALUES(1,30,'2026-10-02')")
        self.payload = dict(comprador_nombre="Nuevo", comprador_telefono="55554444",
                            fecha_venta="2026-10-01", dia_pago_mes=20,
                            total_gtq="120.00", notas="Editado", detalles_entrega="Entrega")

    def edit(self, **changes):
        return actualizar_venta(1, VentaUpdate(**(self.payload | changes)), {"workspace_id": 1})

    def test_edit_preserves_payments_and_recomputes_balance(self):
        self.assertEqual(self.edit()["saldo_pendiente"], 90)
        with get_db() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM abonos").fetchone()[0], 1)
            self.assertEqual(db.execute("SELECT comprador_nombre FROM ventas").fetchone()[0], "Nuevo")

    def test_total_below_payments_rolls_back(self):
        with self.assertRaises(HTTPException) as error:
            self.edit(total_gtq="29.99")
        self.assertEqual(error.exception.status_code, 400)
        with get_db() as db:
            self.assertEqual(db.execute("SELECT total_gtq FROM ventas").fetchone()[0], 100)

    def test_paid_total_completes_sale(self):
        self.assertEqual(self.edit(total_gtq="30.00")["estado"], "completada")
        with self.assertRaises(HTTPException) as error:
            self.edit()
        self.assertEqual(error.exception.status_code, 409)

    def test_workspace_isolation(self):
        with self.assertRaises(HTTPException) as error:
            actualizar_venta(1, VentaUpdate(**self.payload), {"workspace_id": 2})
        self.assertEqual(error.exception.status_code, 404)

    def test_invalid_inputs(self):
        for changes in ({"total_gtq": "NaN"}, {"total_gtq": "-1"},
                        {"total_gtq": "1.001"}, {"dia_pago_mes": 32},
                        {"comprador_nombre": "  "}, {"fecha_venta": "2026-02-30"}):
            with self.subTest(changes=changes), self.assertRaises(ValidationError):
                VentaUpdate(**(self.payload | changes))


if __name__ == "__main__":
    unittest.main()
