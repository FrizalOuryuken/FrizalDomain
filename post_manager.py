"""Frizal Domain post manager. Python 3 + Tkinter, no third-party packages."""
import copy
import datetime as dt
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import uuid
import webbrowser

ROOT = Path(__file__).resolve().parent
SOURCES = {'Game': ('games.js', 'PROJECTS'), 'Blog': ('blog.js', 'BLOG_POSTS')}


def read_posts(path, variable):
    text = path.read_text(encoding='utf-8-sig')
    match = re.search(r'window\.' + re.escape(variable) + r'\s*=\s*', text)
    if not match:
        raise ValueError('Tidak menemukan window.' + variable)
    data, end = json.JSONDecoder().raw_decode(text[match.end():].lstrip())
    if not isinstance(data, list) or any(not isinstance(x, dict) for x in data):
        raise ValueError('Data harus berupa array objek JSON.')
    return data


def save_posts(path, variable, posts, expected):
    if path.read_bytes() != expected:
        raise ValueError('File berubah di luar aplikasi. Muat ulang sebelum menyimpan agar perubahan tidak tertimpa.')
    backup = ROOT / '.post-manager-backups'
    backup.mkdir(exist_ok=True)
    shutil.copy2(path, backup / (path.name + '.' + dt.datetime.now().strftime('%Y%m%d-%H%M%S-%f') + '.bak'))
    text = '// Dikelola dengan Frizal Domain Post Manager.\nwindow.' + variable + ' = ' + json.dumps(posts, ensure_ascii=False, indent=2) + ';\n'
    fd, name = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as out:
            out.write(text)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)
    return path.read_bytes()

# kind, choices and nested schemas keep every editing surface structured.
SCHEMAS = {
 'link': [('label', 'Label tombol', 'text'), ('url', 'URL HTTP / HTTPS', 'url')],
 'history': [('version', 'Versi', 'text'), ('date', 'Tanggal (contoh: 21 September 2026)', 'text'), ('changes', 'Perubahan', 'long')],
 'media': [('type', 'Jenis media', ('image', 'youtube')), ('url', 'Path gambar / URL YouTube', 'text'), ('alt', 'Deskripsi media', 'text'), ('fit', 'Tampilan gambar', ('contain', 'cover'))],
 'item': [('title', 'Judul item', 'text'), ('type', 'Tipe (pisahkan dengan koma)', 'array'), ('group', 'Accordion (kosong = tampil langsung)', 'text'), ('description', 'Deskripsi', 'long')],
 'post': [('title', 'Judul post', 'text'), ('id', 'ID unik / folder media', 'text'), ('publishedAt', 'Tanggal publish (YYYY-MM-DD)', 'text'), ('game', 'Game', 'text'), ('series', 'Seri', 'text'), ('platform', 'Platform', 'text'), ('pinned', 'Pinned', 'bool'), ('pin_number', 'Urutan pin (angka kecil lebih dulu)', 'number'), ('description', 'Ringkasan', 'long'), ('content', 'Isi informasi (pisahkan paragraf dengan baris kosong)', 'content')]
}
NESTED = {'post': [('media', 'Media', 'media'), ('items', 'Item & link', 'item')], 'item': [('links', 'Link', 'link'), ('versionHistory', 'Riwayat versi', 'history')]}


class ListEditor(ttk.Frame):
    def __init__(self, parent, data, kind, post_id):
        super().__init__(parent, padding=8)
        self.data, self.kind, self.post_id = data, kind, post_id
        self.box = tk.Listbox(self, height=8, exportselection=False, activestyle='none')
        self.box.pack(side='left', fill='both', expand=True)
        scroll = ttk.Scrollbar(self, command=self.box.yview)
        scroll.pack(side='left', fill='y')
        self.box.config(yscrollcommand=scroll.set)
        buttons = ttk.Frame(self, padding=(8, 0))
        buttons.pack(side='right', fill='y')
        for label, command in [('Tambah', self.add), ('Edit', self.edit), ('Hapus', self.delete), ('Naik ↑', lambda: self.move(-1)), ('Turun ↓', lambda: self.move(1))]:
            ttk.Button(buttons, text=label, command=command).pack(fill='x', pady=3)
        self.box.bind('<Double-Button-1>', lambda e: self.edit())
        self.refresh()

    def refresh(self, index=None):
        self.box.delete(0, 'end')
        for i, item in enumerate(self.data):
            label = item.get('title') or item.get('label') or item.get('alt') or item.get('version') or item.get('url') or '(belum diberi nama)'
            self.box.insert('end', str(i + 1) + '. ' + str(label))
        if index is not None and self.data:
            self.box.selection_set(min(index, len(self.data)-1))

    def selected(self):
        return self.box.curselection()[0] if self.box.curselection() else None

    def add(self):
        dialog = Editor(self.winfo_toplevel(), self.kind, {}, self.post_id)
        self.wait_window(dialog)
        if dialog.result is not None:
            self.data.append(dialog.result)
            self.refresh(len(self.data)-1)

    def edit(self):
        index = self.selected()
        if index is None:
            return
        dialog = Editor(self.winfo_toplevel(), self.kind, self.data[index], self.post_id)
        self.wait_window(dialog)
        if dialog.result is not None:
            self.data[index] = dialog.result
            self.refresh(index)

    def delete(self):
        index = self.selected()
        if index is not None and messagebox.askyesno('Hapus', 'Hapus entri terpilih?', parent=self):
            del self.data[index]
            self.refresh(index)

    def move(self, step):
        index = self.selected()
        if index is not None and 0 <= index + step < len(self.data):
            self.data[index], self.data[index+step] = self.data[index+step], self.data[index]
            self.refresh(index+step)


class Editor(tk.Toplevel):
    def __init__(self, parent, kind, data, post_id=''):
        super().__init__(parent)
        self.title('Edit ' + {'post':'Post', 'item':'Item', 'media':'Media', 'link':'Link', 'history':'Riwayat versi'}[kind])
        self.geometry('780x720')
        self.minsize(560, 450)
        self.transient(parent)
        self.result = None
        self.kind, self.data, self.post_id = kind, copy.deepcopy(data), post_id
        if kind == 'post' and not self.data.get('id'):
            self.data['id'] = 'post-' + uuid.uuid4().hex[:10]
            self.data['publishedAt'] = dt.date.today().isoformat()
        self.controls = {}
        notebook = ttk.Notebook(self)
        notebook.pack(fill='both', expand=True, padx=12, pady=12)
        general = ttk.Frame(notebook)
        notebook.add(general, text='Informasi')
        canvas = tk.Canvas(general, highlightthickness=0)
        scrollbar = ttk.Scrollbar(general, orient='vertical', command=canvas.yview)
        canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side='right', fill='y')
        canvas.pack(side='left', fill='both', expand=True)
        form = ttk.Frame(canvas, padding=12)
        window = canvas.create_window((0, 0), window=form, anchor='nw')
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(window, width=e.width))
        form.bind('<Configure>', lambda e: canvas.configure(scrollregion=canvas.bbox('all')))
        form.columnconfigure(0, weight=1)
        for key, label, field in SCHEMAS[kind]:
            ttk.Label(form, text=label).pack(anchor='w', pady=(10, 3))
            value = self.data.get(key, '')
            if field == 'bool':
                control = tk.BooleanVar(value=value is True)
                ttk.Checkbutton(form, text='Sematkan di depan', variable=control).pack(anchor='w')
            elif field in ('long', 'content'):
                control = tk.Text(form, height=5, wrap='word', undo=True, font=('Segoe UI', 10))
                if isinstance(value, list):
                    value = '\n\n'.join(value)
                control.insert('1.0', value or '')
                control.pack(fill='x')
            else:
                if field == 'array':
                    value = ', '.join(value) if isinstance(value, list) else value
                control = tk.StringVar(value='' if value is None else str(value))
                if isinstance(field, tuple):
                    if not control.get():
                        control.set(field[0])
                    widget = ttk.Combobox(form, textvariable=control, values=field, state='readonly')
                else:
                    widget = ttk.Entry(form, textvariable=control)
                widget.pack(fill='x')
            self.controls[key] = (control, field)
        if kind == 'media':
            ttk.Button(form, text='Pilih & salin gambar ke folder post…', command=self.import_image).pack(anchor='w', pady=12)
        for key, label, childkind in NESTED.get(kind, []):
            data_list = self.data.setdefault(key, [])
            page = ListEditor(notebook, data_list, childkind, self.data.get('id', post_id) if kind == 'post' else post_id)
            notebook.add(page, text=label)
        bottom = ttk.Frame(self, padding=12)
        bottom.pack(fill='x')
        ttk.Label(bottom, text='Terapkan menaruh perubahan ke draft; simpan file dari jendela utama.').pack(side='left')
        ttk.Button(bottom, text='Batal', command=self.destroy).pack(side='right', padx=4)
        ttk.Button(bottom, text='Terapkan', command=self.apply).pack(side='right', padx=4)
        self.bind('<Escape>', lambda e: self.destroy())
        self.grab_set()

    def destroy(self):
        parent = self.master
        super().destroy()
        if isinstance(parent, Editor) and parent.winfo_exists():
            parent.grab_set()

    def import_image(self):
        source = filedialog.askopenfilename(parent=self, filetypes=[('Gambar', '*.png *.jpg *.jpeg *.webp *.gif *.svg'), ('Semua file', '*.*')])
        if not source:
            return
        try:
            folder_id = self.post_id
            if not re.fullmatch(r'[A-Za-z0-9_-]+', folder_id):
                raise ValueError('ID post harus diisi dengan huruf, angka, - atau _.')
            folder = ROOT / 'images' / folder_id
            folder.mkdir(parents=True, exist_ok=True)
            src = Path(source)
            target = folder / src.name
            if src.resolve() != target.resolve():
                if target.exists():
                    target = folder / (src.stem + '-' + uuid.uuid4().hex[:6] + src.suffix)
                shutil.copy2(src, target)
            self.controls['type'][0].set('image')
            self.controls['url'][0].set(target.relative_to(ROOT).as_posix())
            if not self.controls['alt'][0].get():
                self.controls['alt'][0].set(src.stem)
        except Exception as error:
            messagebox.showerror('Gagal impor', str(error), parent=self)

    def apply(self):
        from urllib.parse import urlparse
        result = copy.deepcopy(self.data)
        try:
            for key, (control, field) in self.controls.items():
                value = control.get('1.0', 'end-1c').strip() if field in ('long', 'content') else control.get()
                if isinstance(value, str):
                    value = value.strip()
                if field == 'array':
                    value = list(dict.fromkeys(x.strip() for x in value.split(',') if x.strip()))
                elif field == 'number':
                    value = int(value) if value else None
                    if value is not None and value < 1:
                        raise ValueError('Urutan pin minimal 1.')
                elif field == 'content':
                    # Preserve string/array representation when editing existing content.
                    value = value.split('\n\n') if isinstance(self.data.get(key), list) else value
                if key in self.data or value not in ('', None, False, []):
                    result[key] = value
            if self.kind == 'post':
                if not result.get('title'):
                    raise ValueError('Judul wajib diisi.')
                if not re.fullmatch(r'[A-Za-z0-9_-]+', result.get('id', '')):
                    raise ValueError('ID harus berupa huruf, angka, - atau _.')
                if result.get('publishedAt'):
                    dt.date.fromisoformat(result['publishedAt'])
                if result.get('pinned') and not result.get('pin_number'):
                    raise ValueError('Isi urutan pin untuk post pinned.')
            if self.kind == 'link':
                parsed = urlparse(result.get('url', ''))
                if parsed.scheme not in ('http', 'https') or not parsed.netloc:
                    raise ValueError('Link harus URL HTTP/HTTPS yang valid.')
            if self.kind == 'media':
                url = result.get('url', '')
                if not url:
                    raise ValueError('Isi path gambar atau URL YouTube.')
                parsed = urlparse(url)
                if result.get('type') in ('video', 'youtube'):
                    if parsed.scheme not in ('http', 'https') or parsed.hostname not in ('youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'):
                        raise ValueError('Gunakan URL YouTube yang valid.')
                elif not parsed.scheme:
                    file = (ROOT / url).resolve()
                    if not file.is_relative_to(ROOT) or not file.is_file():
                        raise ValueError('Gambar lokal tidak ditemukan di folder situs.')
                elif parsed.scheme not in ('http', 'https'):
                    raise ValueError('URL gambar harus HTTP/HTTPS atau path lokal.')
            self.result = result
            self.destroy()
        except (ValueError, TypeError) as error:
            messagebox.showerror('Periksa isian', str(error), parent=self)


class Manager(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title('Frizal Domain — Post Manager')
        self.geometry('1050x650')
        self.minsize(740, 450)
        ttk.Style(self).theme_use('clam')
        self.data, self.original, self.bytes = {}, {}, {}
        self.mode = tk.StringVar(value='Game')
        self.query = tk.StringVar()
        head = ttk.Frame(self, padding=16)
        head.pack(fill='x')
        ttk.Label(head, text='Frizal Domain', font=('Segoe UI', 20, 'bold')).pack(side='left')
        ttk.Label(head, text='  POST MANAGER', foreground='#687466').pack(side='left')
        bar = ttk.Frame(self, padding=(16, 0, 16, 12))
        bar.pack(fill='x')
        for name in SOURCES:
            ttk.Radiobutton(bar, text=name, variable=self.mode, value=name, command=self.refresh).pack(side='left', padx=8)
        ttk.Entry(bar, textvariable=self.query, width=32).pack(side='right')
        ttk.Label(bar, text='Cari judul  ').pack(side='right')
        self.query.trace_add('write', lambda *args: self.refresh())
        self.tree = ttk.Treeview(self, columns=('title', 'date', 'game', 'pin'), show='headings', selectmode='browse')
        for key, label, width in [('title', 'Judul', 430), ('date', 'Publish', 110), ('game', 'Game', 200), ('pin', 'Pin', 70)]:
            self.tree.heading(key, text=label)
            self.tree.column(key, width=width)
        self.tree.pack(fill='both', expand=True, padx=16)
        self.tree.bind('<Double-Button-1>', lambda e: self.edit())
        bar = ttk.Frame(self, padding=16)
        bar.pack(fill='x')
        for label, fn in [('Tambah post', self.add), ('Edit', self.edit), ('Duplikat', self.duplicate), ('Hapus', self.delete), ('Muat ulang', self.reload), ('Simpan tab ini', self.save), ('Buka situs', lambda: webbrowser.open((ROOT/'index.html').as_uri()))]:
            ttk.Button(bar, text=label, command=fn).pack(side='left', padx=3)
        self.status = tk.StringVar()
        ttk.Label(self, textvariable=self.status, padding=(16, 0, 16, 16)).pack(anchor='w')
        self.protocol('WM_DELETE_WINDOW', self.exit)
        self.bind('<Control-s>', lambda e: self.save())
        try:
            for mode in SOURCES:
                self.load(mode)
            self.refresh()
        except Exception as error:
            messagebox.showerror('Data tidak bisa dibuka', str(error), parent=self)
            self.destroy()

    def load(self, mode):
        name, variable = SOURCES[mode]
        path = ROOT / name
        data = read_posts(path, variable)
        self.data[mode], self.original[mode], self.bytes[mode] = data, copy.deepcopy(data), path.read_bytes()

    def refresh(self):
        self.tree.delete(*self.tree.get_children())
        mode = self.mode.get()
        for i, post in enumerate(self.data.get(mode, [])):
            if self.query.get().casefold() in post.get('title', '').casefold():
                self.tree.insert('', 'end', iid=str(i), values=(post.get('title'), post.get('publishedAt', ''), post.get('game', ''), post.get('pin_number') if post.get('pinned') else '—'))
        dirty = self.data.get(mode) != self.original.get(mode)
        self.status.set(mode + ' • ' + str(len(self.data.get(mode, []))) + ' post • ' + ('Perubahan belum disimpan' if dirty else 'Tersimpan') + ' • Ctrl+S untuk simpan')

    def index(self):
        selected = self.tree.selection()
        return int(selected[0]) if selected else None

    def add(self):
        self.edit(new=True)

    def edit(self, new=False):
        index = None if new else self.index()
        if index is None and not new:
            return
        posts = self.data[self.mode.get()]
        dialog = Editor(self, 'post', {} if new else posts[index])
        self.wait_window(dialog)
        if dialog.result is not None:
            if any(p.get('id') == dialog.result.get('id') for i, p in enumerate(posts) if i != index):
                messagebox.showerror('ID duplikat', 'ID sudah dipakai. Perubahan belum diterapkan.', parent=self)
                return
            if new:
                posts.append(dialog.result)
            else:
                posts[index] = dialog.result
            self.refresh()

    def duplicate(self):
        index = self.index()
        if index is not None:
            posts = self.data[self.mode.get()]
            post = copy.deepcopy(posts[index])
            post['id'] = 'post-' + uuid.uuid4().hex[:10]
            post['title'] += ' (salinan)'
            post['pinned'], post['pin_number'] = False, None
            posts.append(post)
            self.refresh()

    def delete(self):
        index = self.index()
        if index is not None and messagebox.askyesno('Hapus post', 'Hapus post ini? File gambar tetap disimpan.', parent=self):
            del self.data[self.mode.get()][index]
            self.refresh()

    def save(self):
        mode = self.mode.get()
        name, variable = SOURCES[mode]
        try:
            self.bytes[mode] = save_posts(ROOT/name, variable, self.data[mode], self.bytes[mode])
            self.original[mode] = copy.deepcopy(self.data[mode])
            self.refresh()
        except Exception as error:
            messagebox.showerror('Gagal menyimpan', str(error), parent=self)

    def reload(self):
        mode = self.mode.get()
        if self.data[mode] != self.original[mode] and not messagebox.askyesno('Muat ulang', 'Buang draft tab ini dan baca file kembali?', parent=self):
            return
        try:
            self.load(mode)
            self.refresh()
        except Exception as error:
            messagebox.showerror('Gagal memuat', str(error), parent=self)

    def exit(self):
        if any(self.data[k] != self.original[k] for k in self.data) and not messagebox.askyesno('Tutup', 'Ada draft belum disimpan. Tutup tanpa menyimpan?', parent=self):
            return
        self.destroy()


if __name__ == '__main__':
    Manager().mainloop()
