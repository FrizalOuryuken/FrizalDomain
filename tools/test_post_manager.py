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

class InterfaceTests(unittest.TestCase):
    def test_forms_and_nested_lists(self):
        app = pm.Manager()
        app.withdraw()
        try:
            app.update_idletasks()
            self.assertEqual(len(app.tree.get_children()), len(app.data['Game']))
            app.mode.set('Blog')
            app.refresh()
            self.assertEqual(len(app.tree.get_children()), len(app.data['Blog']))
            for kind, value in [
                ('post', {'id': 'smoke-test', 'title': 'Test', 'publishedAt': '2026-09-22', 'pinned': True, 'pin_number': 1, 'media': [], 'items': [], 'customField': 'preserved'}),
                ('item', {'title': 'Mod', 'type': ['Mod', 'Tools'], 'links': [], 'versionHistory': []}),
                ('media', {'type': 'youtube', 'url': 'https://youtu.be/VvZYFl8iH8o'}),
                ('link', {'label': 'Download', 'url': 'https://example.com/file'}),
                ('history', {'version': '1.0', 'date': '22 September 2026', 'changes': 'Release'})
            ]:
                dialog = pm.Editor(app, kind, value, 'smoke-test')
                dialog.withdraw()
                dialog.update_idletasks()
                dialog.apply()
                self.assertIsNotNone(dialog.result)
                for key, expected in value.items():
                    self.assertEqual(dialog.result[key], expected)
        finally:
            app.destroy()

if __name__ == '__main__':
    unittest.main()
