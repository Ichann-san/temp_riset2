"""Focused checks for key persistence and configuration; no real database or secrets."""
import importlib.util
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('local_backend', Path(__file__).resolve().parents[1] / 'scripts/local_backend.py')
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class Connection:
    def __init__(self, has_patients=False, has_table=True):
        self.has_patients = has_patients
        self.has_table = has_table
        self.calls = []

    def execute(self, query):
        self.calls.append(query)
        value = ('registration.patient' if self.has_table else None) if 'to_regclass' in query else self.has_patients
        return type('Result', (), {'fetchone': lambda self: (value,)})()


class LocalLauncherTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.path = self.base / '.local' / 'nik.key'
        self.env = patch.dict(os.environ, {}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_key_generated_once_and_reused_without_database_reads(self):
        first = launcher.persistent_key(Connection(), self.path)
        self.assertEqual(len(first), 64)
        existing = Connection(has_patients=True)
        self.assertEqual(launcher.persistent_key(existing, self.path), first)
        self.assertEqual(existing.calls, [])

    def test_missing_key_with_patient_records_is_refused(self):
        with self.assertRaisesRegex(RuntimeError, 'data pasien masih ada'):
            launcher.persistent_key(Connection(has_patients=True), self.path)
        self.assertFalse(self.path.exists())

    def test_new_schema_can_create_key(self):
        self.assertEqual(len(launcher.persistent_key(Connection(has_table=False), self.path)), 64)

    def test_supplied_original_key_is_saved(self):
        os.environ['ISLAH_NIK_KEY'] = 'ab' * 32
        self.assertEqual(launcher.persistent_key(Connection(has_patients=True), self.path), 'ab' * 32)

    def test_conflicting_or_corrupt_key_is_not_overwritten(self):
        original = launcher.persistent_key(Connection(), self.path)
        os.environ['ISLAH_NIK_KEY'] = 'ab' * 32
        with self.assertRaisesRegex(RuntimeError, 'berbeda'):
            launcher.persistent_key(Connection(), self.path)
        self.assertEqual(self.path.read_text().strip(), original)
        del os.environ['ISLAH_NIK_KEY']
        self.path.write_text('invalid', encoding='ascii')
        with self.assertRaises(RuntimeError):
            launcher.persistent_key(Connection(), self.path)
        self.assertEqual(self.path.read_text(), 'invalid')

    def test_powershell_json_bom_and_environment_override(self):
        self.path.parent.mkdir()
        config = {'database_url': 'dbname=mcu_registration', 'pgpassword': 'synthetic-test-password'}
        (self.path.parent / 'settings.json').write_text(json.dumps(config), encoding='utf-8-sig')
        self.assertEqual(launcher.configure(self.base), config['database_url'])
        self.assertEqual(os.environ['PGPASSWORD'], config['pgpassword'])
        os.environ['DATABASE_URL'] = 'dbname=isolated_test'
        os.environ['PGPASSWORD'] = 'other-synthetic-test-password'
        self.assertEqual(launcher.configure(self.base), 'dbname=isolated_test')
        self.assertEqual(os.environ['PGPASSWORD'], 'other-synthetic-test-password')


if __name__ == '__main__':
    unittest.main()
