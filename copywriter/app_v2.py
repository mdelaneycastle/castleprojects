"""
CopyWriter V2
A streamlined copywriting tool with cloud storage.
"""

import streamlit as st
import os
from dotenv import load_dotenv

load_dotenv()

# Page config
st.set_page_config(
    page_title="CopyWriter V2",
    layout="wide"
)

from supabase_storage import (
    get_artists,
    create_artist,
    get_style_guide,
    save_style_guide,
    get_documents,
    upload_document,
    delete_document,
)

SUPPORTED_EXTENSIONS = {'.docx', '.pdf', '.html', '.htm', '.doc', '.txt'}


def get_api_key():
    """Get OpenAI API key: session override > Streamlit secrets > env var."""
    if 'openai_api_key' in st.session_state and st.session_state.openai_api_key:
        return st.session_state.openai_api_key
    try:
        return st.secrets["OPENAI_API_KEY"]
    except Exception:
        pass
    env_key = os.getenv('OPENAI_API_KEY')
    if env_key:
        return env_key
    return None


def init_session_state():
    """Initialize session state variables."""
    if 'current_artist' not in st.session_state:
        artists = get_artists()
        st.session_state.current_artist = artists[0] if artists else None
    if 'style_guide_v2' not in st.session_state:
        st.session_state.style_guide_v2 = None
    if 'generated_copy_v2' not in st.session_state:
        st.session_state.generated_copy_v2 = None


# Initialize
init_session_state()

# Load style guide for current artist
if st.session_state.style_guide_v2 is None and st.session_state.current_artist:
    st.session_state.style_guide_v2 = get_style_guide(
        st.session_state.current_artist['id']
    )

# Sidebar
st.sidebar.title("CopyWriter V2")

# Artist selector
artists = get_artists()
if artists:
    artist_names = [a['name'] for a in artists]
    current_idx = 0
    if st.session_state.current_artist:
        try:
            current_idx = next(
                i for i, a in enumerate(artists)
                if a['id'] == st.session_state.current_artist['id']
            )
        except StopIteration:
            current_idx = 0

    selected_idx = st.sidebar.selectbox(
        "Select Artist",
        range(len(artists)),
        index=current_idx,
        format_func=lambda i: artists[i]['name'],
    )
    selected = artists[selected_idx]

    if (
        not st.session_state.current_artist
        or selected['id'] != st.session_state.current_artist['id']
    ):
        st.session_state.current_artist = selected
        st.session_state.style_guide_v2 = get_style_guide(selected['id'])
        st.session_state.generated_copy_v2 = None
        st.rerun()
else:
    st.sidebar.warning("No artists found. Add one in Settings.")

st.sidebar.markdown("---")

# Navigation
page = st.sidebar.radio(
    "Navigation",
    ["Style Guide", "Generate Copy", "Settings"]
)


# ============================================
# STYLE GUIDE PAGE
# ============================================
if page == "Style Guide":
    st.title("Style Guide")
    st.caption("Upload documents, then generate a style guide")

    artist = st.session_state.current_artist
    if not artist:
        st.warning("Please create an artist in Settings first.")
    elif not get_api_key():
        st.warning("Please configure your OpenAI API key in Settings.")
    else:
        # --- Document management ---
        st.markdown("### Source Documents")

        docs = get_documents(artist['id'])

        if docs:
            st.success(f"Found {len(docs)} documents")
            for doc in docs:
                col1, col2 = st.columns([4, 1])
                with col1:
                    size_kb = (doc.get('file_size') or 0) / 1024
                    st.markdown(f"- **{doc['filename']}** ({size_kb:.0f} KB)")
                with col2:
                    if st.button("Remove", key=f"del_{doc['id']}"):
                        delete_document(doc['id'], doc.get('storage_path'))
                        st.rerun()
        else:
            st.info("No documents yet. Upload some below.")

        # Upload new documents
        st.markdown("### Upload Documents")
        uploaded_files = st.file_uploader(
            "Upload source documents for style analysis",
            type=['docx', 'pdf', 'html', 'htm', 'doc', 'txt'],
            accept_multiple_files=True,
        )

        if uploaded_files and st.button("Process Uploads", type="primary"):
            from src.document_parser import parse_document_bytes

            for f in uploaded_files:
                with st.spinner(f"Processing {f.name}..."):
                    try:
                        file_bytes = f.getvalue()
                        parsed = parse_document_bytes(f.name, file_bytes)
                        upload_document(
                            artist_id=artist['id'],
                            artist_slug=artist['slug'],
                            filename=f.name,
                            file_bytes=file_bytes,
                            extracted_text=parsed['full_text'],
                        )
                        st.write(f"Uploaded: {f.name}")
                    except Exception as e:
                        st.warning(f"Could not process {f.name}: {e}")
            st.rerun()

        st.markdown("---")

        # --- Current style guide ---
        if st.session_state.style_guide_v2:
            st.markdown("### Current Style Guide")
            st.info("Style guide has been generated. You can regenerate it below if needed.")

            with st.expander("View Full Style Guide", expanded=True):
                st.markdown(st.session_state.style_guide_v2)

            if st.checkbox("Edit style guide manually"):
                edited = st.text_area(
                    "Edit Style Guide",
                    value=st.session_state.style_guide_v2,
                    height=400,
                )
                if st.button("Save Changes"):
                    st.session_state.style_guide_v2 = edited
                    save_style_guide(artist['id'], edited)
                    st.success("Style guide saved!")
                    st.rerun()

        st.markdown("---")

        # --- Generate / Regenerate ---
        docs = get_documents(artist['id'])
        has_docs = len(docs) > 0

        button_label = (
            "Regenerate Style Guide"
            if st.session_state.style_guide_v2
            else "Generate Style Guide"
        )

        if st.button(button_label, type="primary", disabled=not has_docs):
            with st.spinner("Analysing documents... This may take a moment."):
                from src.generator_v2 import StyleAnalyzerV2

                # Build document list from extracted text in DB
                documents = []
                for doc in docs:
                    if doc.get('extracted_text'):
                        documents.append({
                            'filename': doc['filename'],
                            'full_text': doc['extracted_text'],
                        })

                if documents:
                    analyzer = StyleAnalyzerV2(get_api_key())
                    style_guide = analyzer.analyze(
                        documents,
                        artist_name=artist['name'],
                    )

                    st.session_state.style_guide_v2 = style_guide
                    save_style_guide(artist['id'], style_guide)

                    st.success("Style guide generated!")
                    st.rerun()
                else:
                    st.error("No documents could be read.")


# ============================================
# GENERATE COPY PAGE
# ============================================
elif page == "Generate Copy":
    st.title("Generate Copy")
    st.caption("Describe what you need, get copy in the artist's voice")

    artist = st.session_state.current_artist
    if not artist:
        st.warning("Please create an artist in Settings first.")
    elif not get_api_key():
        st.warning("Please configure your OpenAI API key in Settings.")
    elif not st.session_state.style_guide_v2:
        st.warning("Please generate a style guide first (go to the Style Guide tab).")
    else:
        st.success(f"Style guide loaded for {artist['name']}")

        with st.expander("View Style Guide", expanded=False):
            st.markdown(st.session_state.style_guide_v2)

        st.markdown("---")
        st.markdown("### What would you like to write?")

        context = st.text_area(
            "Describe what you want to write about",
            placeholder='Example: "The new pieces are based on Peaky Blinders. '
            'The Garrison piece shows Arthur Shelby, Faith shows Polly, '
            'Soldier\'s Minute shows Thomas Shelby, and Black Patch shows '
            'Thomas, Arthur and John Shelby. '
            'Please generate a press release for this collection."',
            height=150,
        )

        doc_type = st.selectbox(
            "Document Type",
            ["press_release", "collection_overview", "bio", "paid_ads", "general"],
            format_func=lambda x: {
                'press_release': 'Press Release',
                'collection_overview': 'Collection Overview',
                'bio': 'Artist Bio',
                'paid_ads': 'Paid Ads (Meta + Google)',
                'general': 'General',
            }.get(x, x.replace('_', ' ').title()),
        )

        # Image upload
        st.markdown("### Artwork Images (optional)")
        uploaded_images = st.file_uploader(
            "Upload artwork images",
            type=['png', 'jpg', 'jpeg', 'webp'],
            accept_multiple_files=True,
            help="Upload images of the artworks you're writing about",
        )

        if uploaded_images:
            cols = st.columns(min(len(uploaded_images), 4))
            for i, img in enumerate(uploaded_images):
                with cols[i % 4]:
                    st.image(img, caption=img.name, use_container_width=True)

        st.markdown("---")

        if st.button("Generate Copy", type="primary", use_container_width=True):
            if not context.strip():
                st.error("Please describe what you want to write.")
            else:
                with st.spinner("Generating copy..."):
                    from src.generator_v2 import CopyGeneratorV2

                    generator = CopyGeneratorV2(get_api_key())

                    images = []
                    if uploaded_images:
                        for img in uploaded_images:
                            images.append({
                                'bytes': img.getvalue(),
                                'name': img.name,
                            })

                    full_context = (
                        f"Document type: {doc_type.replace('_', ' ')}\n\n{context}"
                    )

                    result = generator.generate(
                        style_guide=st.session_state.style_guide_v2,
                        doc_type=doc_type,
                        context=full_context,
                        images=images,
                    )

                    st.session_state.generated_copy_v2 = result

                st.success("Copy generated!")

        if st.session_state.generated_copy_v2:
            st.markdown("---")
            st.markdown("### Generated Copy")
            st.markdown(st.session_state.generated_copy_v2)

            st.markdown("---")
            st.text_area(
                "Copy to clipboard (Ctrl+A, Ctrl+C)",
                value=st.session_state.generated_copy_v2,
                height=300,
                label_visibility="collapsed",
            )


# ============================================
# SETTINGS PAGE
# ============================================
elif page == "Settings":
    st.title("Settings")

    # Artist Management
    st.markdown("### Artist Management")

    col1, col2 = st.columns([2, 1])
    with col1:
        new_artist_name = st.text_input(
            "Add New Artist",
            placeholder="e.g., Jon Jones, Bob Ross",
        )
    with col2:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("Add Artist", type="primary"):
            if new_artist_name:
                new_artist = create_artist(new_artist_name)
                st.session_state.current_artist = new_artist
                st.session_state.style_guide_v2 = None
                st.success(f"Created artist: {new_artist['name']}")
                st.rerun()

    artists = get_artists()
    if artists:
        st.markdown("**Existing Artists:**")
        for a in artists:
            guide = get_style_guide(a['id'])
            status = "Ready" if guide else "Pending"
            col1, col2 = st.columns([3, 1])
            with col1:
                st.markdown(f"**{a['name']}** — {status}")
            with col2:
                if (
                    st.session_state.current_artist
                    and a['id'] == st.session_state.current_artist['id']
                ):
                    st.caption("Selected")

    st.markdown("---")

    # API Key
    st.markdown("### OpenAI API Key")

    current_key = get_api_key()
    key_status = "API key configured" if current_key else "No API key set"
    st.info(key_status)

    new_key = st.text_input(
        "API Key (session override)",
        type="password",
        placeholder="sk-...",
        help="Overrides the key in secrets for this session only",
    )

    if st.button("Save API Key"):
        if new_key:
            st.session_state.openai_api_key = new_key
            st.success("API key saved for this session!")
            st.rerun()

    st.markdown("---")

    st.markdown("### About")
    st.markdown("""
    **CopyWriter V2** reverse-engineers an artist's writing voice from existing
    documents, then generates new copy in that exact style.

    1. **Upload** source documents (press releases, bios, collection overviews)
    2. **Generate** a style guide — builds a reusable voice system
    3. **Write** new copy by describing what you need in plain English
    """)
