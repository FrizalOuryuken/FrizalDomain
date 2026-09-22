import copy
import tempfile
import unittest
from pathlib import Path
import post_manager as pm

class StorageTests(unittest.TestCase):
    def test_current_data(self):
        for filename, variable in pm.SOURCES.values():
            self.assertIsInstance(pm.read_posts(pm.ROOT / filename, variable), list)

    def test_roundtrip_backup_and_conflict(self):
        with tempfile.TemporaryDirectory() as folder:
            old_root = pm.ROOT
            pm.ROOT = Path(folder)
            try:
                path = pm.ROOT / 'games.js'
                path.write_text('window.PROJECTS = [];', encoding='utf-8')
                original = path.read_bytes()
                posts = [{'id': 'test', 'title': 'Bahasa Indonesia →', 'unknown': {'keep': True}, 'items': [{'type': ['Mod', 'Tools'], 'links': []}]}]
                new_bytes = pm.save_posts(path, 'PROJECTS', posts, original)
                self.assertEqual(pm.read_posts(path, 'PROJECTS'), posts)
                backups = list((pm.ROOT / '.post-manager-backups').iterdir())
                self.assertEqual(backups[0].read_bytes(), original)
                path.write_text('window.PROJECTS = [{"external": true}];')
                external = path.read_bytes()
                with self.assertRaises(ValueError):
                    pm.save_posts(path, 'PROJECTS', [], new_bytes)
                self.assertEqual(path.read_bytes(), external)
            finally:
                pm.ROOT = old_root

if __name__ == '__main__':
    unittest.main()
