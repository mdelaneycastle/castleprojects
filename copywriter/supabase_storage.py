"""
Supabase storage layer for CopyWriter V2.
Handles all database and file storage operations.
"""

import streamlit as st
from supabase import create_client, Client
from datetime import datetime, timezone


@st.cache_resource
def get_supabase() -> Client:
    """Get or create Supabase client."""
    url = st.secrets["SUPABASE_URL"]
    key = st.secrets["SUPABASE_KEY"]
    return create_client(url, key)


# --- Artists ---

def get_artists() -> list[dict]:
    """Get all artists, sorted by name."""
    response = get_supabase().table("artists").select("*").order("name").execute()
    return response.data


def get_artist_by_slug(slug: str) -> dict | None:
    """Get a single artist by slug."""
    response = (
        get_supabase().table("artists")
        .select("*")
        .eq("slug", slug)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def create_artist(name: str) -> dict:
    """Create a new artist and return the record."""
    slug = name.lower().replace(" ", "-")
    response = (
        get_supabase().table("artists")
        .insert({"slug": slug, "name": name})
        .execute()
    )
    return response.data[0]


# --- Style Guides ---

def get_style_guide(artist_id: str) -> str | None:
    """Get style guide content for an artist."""
    response = (
        get_supabase().table("style_guides")
        .select("content")
        .eq("artist_id", artist_id)
        .limit(1)
        .execute()
    )
    return response.data[0]["content"] if response.data else None


def save_style_guide(artist_id: str, content: str) -> None:
    """Save or update style guide for an artist (upsert)."""
    existing = (
        get_supabase().table("style_guides")
        .select("id")
        .eq("artist_id", artist_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        (
            get_supabase().table("style_guides")
            .update({
                "content": content,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("artist_id", artist_id)
            .execute()
        )
    else:
        (
            get_supabase().table("style_guides")
            .insert({"artist_id": artist_id, "content": content})
            .execute()
        )


# --- Documents ---

def get_documents(artist_id: str) -> list[dict]:
    """Get all document records for an artist."""
    response = (
        get_supabase().table("documents")
        .select("*")
        .eq("artist_id", artist_id)
        .order("created_at")
        .execute()
    )
    return response.data


def upload_document(
    artist_id: str,
    artist_slug: str,
    filename: str,
    file_bytes: bytes,
    extracted_text: str,
) -> dict:
    """Upload a document: file to Storage, metadata + extracted text to DB."""
    storage_path = f"{artist_slug}/{filename}"

    # Upload original file to Supabase Storage
    get_supabase().storage.from_("documents").upload(
        storage_path,
        file_bytes,
        {"content-type": "application/octet-stream"},
    )

    # Insert metadata + extracted text into DB
    response = (
        get_supabase().table("documents")
        .insert({
            "artist_id": artist_id,
            "filename": filename,
            "storage_path": storage_path,
            "extracted_text": extracted_text,
            "file_size": len(file_bytes),
        })
        .execute()
    )
    return response.data[0]


def delete_document(doc_id: str, storage_path: str | None = None) -> None:
    """Delete a document from both Storage and DB."""
    if storage_path:
        try:
            get_supabase().storage.from_("documents").remove([storage_path])
        except Exception:
            pass  # file may already be gone
    get_supabase().table("documents").delete().eq("id", doc_id).execute()
