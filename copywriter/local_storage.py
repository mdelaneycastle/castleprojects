"""
Local storage backend for CopyWriter V2 — a no-cloud drop-in for supabase_storage.

Mirrors the exact public API and the Supabase schema (artists, style_guides,
documents, generated_copy) using a local SQLite database plus a local folder
for original document files. Intended for offline testing only; production
still uses Supabase. Activated by setting USE_LOCAL_DB=1 (see supabase_storage).
"""

import os
import sqlite3
import uuid
from pathlib import Path
from datetime import datetime, timezone

_BASE = Path(__file__).parent / "local_data"
_DB_PATH = _BASE / "copywriter.db"
_FILES_DIR = _BASE / "storage" / "documents"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _connect() -> sqlite3.Connection:
    """Open a connection (one per call — fine at this scale, thread-safe)."""
    _BASE.mkdir(parents=True, exist_ok=True)
    _FILES_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    _ensure_schema(conn)
    return conn


def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS artists (
            id TEXT PRIMARY KEY,
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS style_guides (
            id TEXT PRIMARY KEY,
            artist_id TEXT UNIQUE REFERENCES artists(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            artist_id TEXT REFERENCES artists(id) ON DELETE CASCADE,
            filename TEXT NOT NULL,
            storage_path TEXT,
            extracted_text TEXT,
            file_size INTEGER,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS generated_copy (
            id TEXT PRIMARY KEY,
            artist_id TEXT REFERENCES artists(id) ON DELETE CASCADE,
            doc_type TEXT NOT NULL,
            user_brief TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()


# --- Artists ---

def get_artists() -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute("SELECT * FROM artists ORDER BY name").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_artist_by_slug(slug: str) -> dict | None:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM artists WHERE slug = ? LIMIT 1", (slug,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_artist(name: str) -> dict:
    slug = name.lower().replace(" ", "-")
    rec = {"id": _new_id(), "slug": slug, "name": name, "created_at": _now()}
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO artists (id, slug, name, created_at) VALUES (?, ?, ?, ?)",
            (rec["id"], rec["slug"], rec["name"], rec["created_at"]),
        )
        conn.commit()
        return rec
    finally:
        conn.close()


# --- Style Guides ---

def get_style_guide(artist_id: str) -> str | None:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT content FROM style_guides WHERE artist_id = ? LIMIT 1",
            (artist_id,),
        ).fetchone()
        return row["content"] if row else None
    finally:
        conn.close()


def save_style_guide(artist_id: str, content: str) -> None:
    conn = _connect()
    try:
        existing = conn.execute(
            "SELECT id FROM style_guides WHERE artist_id = ? LIMIT 1", (artist_id,)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE style_guides SET content = ?, updated_at = ? WHERE artist_id = ?",
                (content, _now(), artist_id),
            )
        else:
            now = _now()
            conn.execute(
                "INSERT INTO style_guides (id, artist_id, content, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (_new_id(), artist_id, content, now, now),
            )
        conn.commit()
    finally:
        conn.close()


# --- Documents ---

def get_documents(artist_id: str) -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM documents WHERE artist_id = ? ORDER BY created_at",
            (artist_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def upload_document(
    artist_id: str,
    artist_slug: str,
    filename: str,
    file_bytes: bytes,
    extracted_text: str,
) -> dict:
    storage_path = f"{artist_slug}/{filename}"
    dest = _FILES_DIR / storage_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(file_bytes)

    rec = {
        "id": _new_id(),
        "artist_id": artist_id,
        "filename": filename,
        "storage_path": storage_path,
        "extracted_text": extracted_text,
        "file_size": len(file_bytes),
        "created_at": _now(),
    }
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO documents "
            "(id, artist_id, filename, storage_path, extracted_text, file_size, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                rec["id"], rec["artist_id"], rec["filename"], rec["storage_path"],
                rec["extracted_text"], rec["file_size"], rec["created_at"],
            ),
        )
        conn.commit()
        return rec
    finally:
        conn.close()


def delete_document(doc_id: str, storage_path: str | None = None) -> None:
    if storage_path:
        try:
            (_FILES_DIR / storage_path).unlink(missing_ok=True)
        except Exception:
            pass
    conn = _connect()
    try:
        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        conn.commit()
    finally:
        conn.close()


# --- Generated Copy ---

def save_generated_copy(artist_id: str, doc_type: str, user_brief: str, content: str) -> dict:
    rec = {
        "id": _new_id(),
        "artist_id": artist_id,
        "doc_type": doc_type,
        "user_brief": user_brief,
        "content": content,
        "created_at": _now(),
    }
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO generated_copy "
            "(id, artist_id, doc_type, user_brief, content, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                rec["id"], rec["artist_id"], rec["doc_type"],
                rec["user_brief"], rec["content"], rec["created_at"],
            ),
        )
        conn.commit()
        return rec
    finally:
        conn.close()


def get_generated_copy(artist_id: str) -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM generated_copy WHERE artist_id = ? ORDER BY created_at DESC",
            (artist_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def delete_generated_copy(copy_id: str) -> None:
    conn = _connect()
    try:
        conn.execute("DELETE FROM generated_copy WHERE id = ?", (copy_id,))
        conn.commit()
    finally:
        conn.close()
