"""
Generator V2 - Style analysis and copy generation.
"""

import base64
from openai import OpenAI
from typing import Optional


def encode_image_to_base64(image_bytes: bytes) -> str:
    """Convert image bytes to base64 string."""
    return base64.b64encode(image_bytes).decode('utf-8')


class StyleAnalyzerV2:
    """
    Analyzes documents and produces natural language style guidance.
    """

    def __init__(self, api_key: str):
        self.openai = OpenAI(api_key=api_key)

    def analyze(self, documents: list[dict], artist_name: str = "the artist") -> str:
        """
        Analyze documents and return a production-ready style system.

        Args:
            documents: List of document dicts with 'filename' and 'full_text' keys
            artist_name: Display name of the artist

        Returns:
            Operational style guide specific to this artist's voice
        """
        # Combine all document text
        combined_text = ""
        for doc in documents:
            combined_text += f"\n\n--- {doc['filename']} ---\n"
            combined_text += doc['full_text']

        system_message = (
            "You are a senior editorial copywriter and brand-voice strategist "
            "for a fine art gallery.\n\n"
            "You do NOT summarise documents. You reverse-engineer how the writing "
            "works, then turn it into an operational style system that a team "
            "(and an AI) can reliably reuse.\n\n"
            "Your job:\n"
            "1) Identify the unique voice, tone, and persuasion tactics used to "
            "write about the artist.\n"
            "2) Extract repeatable structures, phrase patterns, and narrative moves.\n"
            "3) Produce a practical style guide that can be used to generate new "
            "copy in the same voice.\n\n"
            "Constraints:\n"
            "- Be specific to THIS artist and THIS corpus (no generic "
            "'art writing' advice).\n"
            "- Prefer rules and patterns over description.\n"
            "- Give do/don't rules that are enforceable.\n"
            "- Include a reusable template and a phrase bank that matches the corpus.\n"
            "- Include 2 short example paragraphs written in the style "
            "(not about new facts — just stylistic demonstration).\n"
            "- If the corpus contains multiple sub-styles (press release vs product "
            "page vs training notes), describe each and how to switch between them.\n\n"
            "Write with the same directness as a copy chief giving instructions.\n"
            "Avoid academic language.\n"
            "Prefer clear, punchy bullets and short explanations."
        )

        user_message = f"""Analyse the attached documents about {artist_name} and build a reusable writing style system.

Treat the attached documents as the only source of truth for style cues.
If different docs conflict, prioritise: press release copy > product copy > training notes.

--- DOCUMENTS ---
{combined_text}
--- END DOCUMENTS ---

Output with these exact headings:

1) Voice Snapshot (5-8 bullets)
- What it feels like
- What it avoids
- Audience assumptions

2) Non-Negotiables (the rules that must always be true)
- 10-15 bullets written as "Always..." / "Never..."

3) Structural Formula (the default flow)
- Give a step-by-step outline of how pieces open, develop, and close
- For each step: purpose + what language/moves are used
- Identify the skeleton that repeats across documents
- Include paragraph-level pacing and transition patterns

4) Narrative Devices and Persuasion Tactics
- e.g., place-anchoring, cultural legacy framing, intimacy/psychology, craft/technique-as-story, quotes-as-proof, charity/community angle, etc.
- For each: how it's executed + example phrasing patterns (not long quotes)

5) Language and Cadence
- Sentence rhythm patterns (how long/short lines alternate)
- Preferred vocabulary clusters (atmosphere, technique, emotion, place, legacy)
- "Avoid list" of words/phrases that break the voice

6) Phrase Bank
- 25-40 reusable phrases/stems grouped by function:
  openers / transitions / technique / emotion / context / closers / calls-to-action
- These must be STRUCTURAL PATTERNS, not specific facts. Use bracket placeholders for any variable content.
- WRONG: "Castle Fine Art will donate £100 to Birmingham Children's Hospital"
- RIGHT: "Castle Fine Art will donate [amount] to [charity]" or just describe the pattern: "Charity tie-in sentence linking purchase to local cause"
- WRONG: "Inspired by the infamous Peaky Blinders gang"
- RIGHT: "Inspired by [cultural/historical reference]..."

7) Reusable Templates
A) Press release template (with bracket placeholders for ALL specific details)
B) Product description template (shorter)
C) 50-word "gallery caption" template
- Templates must contain ZERO specific facts from the source documents.
- Every detail (names, prices, charities, collection titles, subjects) must be a bracket placeholder.

8) Style Stress Test
- 6 common mistakes writers make when trying this voice, and how to fix them

9) Two mini sample paragraphs (style-only demonstration)
- One "press release opening" paragraph (80-120 words)
- One "product description" paragraph (60-90 words)
- Use bracket placeholders for any specific details. These demonstrate VOICE, not content.

CRITICAL RULES:
- The style guide must capture HOW this artist is written about, not WHAT was written about.
- Strip out ALL specific facts from previous releases (charity amounts, collection names, exhibition dates, specific subjects, pricing). These belong to past campaigns and must NOT be recycled into future copy.
- The only reusable facts are: the artist's name, their hometown/background, their core techniques, and their general artistic philosophy.
- Everything else (subjects, collections, prices, charity tie-ins, exhibition details) changes with every release and must be provided fresh by the user.
- When in doubt, use a bracket placeholder rather than a specific fact."""

        response = self.openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=6000
        )

        return response.choices[0].message.content.strip()


FORMAT_RULES = {
    "press_release": """FORMAT: PRESS RELEASE
Length: 500-750 words (hard requirement — do not go shorter)
Paragraphs: 6-8 short paragraphs with strong rhythm

Structure (follow this order):
1. Headline (single line, no quotes)
2. Subhead (single line — location, date, one-sentence summary)
3. Atmospheric opening paragraph — set the mood, anchor in place/culture
4. Artist context paragraph — who they are, their background, artistic intent
5. Collection overview paragraph — what unites the works thematically and emotionally
6. Individual works paragraph(s) — discuss works in narrative groupings, NOT as a list
7. Technique and process paragraph — how the work is made, linked to emotion
8. Emotional/cultural meaning paragraph — what the viewer is invited to feel
9. Closing paragraph — legacy, collectability, cultural significance
10. "Notes to Editors" section — 3-6 bullet points (who/what/where/availability)
11. Boilerplate — 80-120 words about Castle Fine Art and the artist (general, no campaign-specific facts)

At least one quote from the artist (if no exact quote is provided in the brief, write:
"The artist reflects on..." or similar WITHOUT quotation marks).
Write expansively and narratively. Never summarise. Avoid list-like structure in the body.""",

    "collection_overview": """FORMAT: COLLECTION OVERVIEW
Length: 350-500 words (hard requirement — do not go shorter)
Paragraphs: 4-6, flowing editorial tone

Structure:
1. Collection theme and mood — the cultural/historical hook
2. Artist connection to the subject — why this matters to them
3. What the collection explores emotionally and thematically
4. Key works described as a group (not listed individually)
5. Technique, atmosphere, and light/shadow
6. Closing emotional statement — what the viewer takes away

No "Notes to Editors". No boilerplate.
Less formal than a press release but still narrative-driven.
Focus on journey, influences, signature approach, and feeling.""",

    "bio": """FORMAT: ARTIST BIO
Length: 250-350 words (hard requirement — do not go shorter)
Paragraphs: 3-5

Structure:
1. Opening — who they are, where they're from, what defines their practice
2. Artistic journey — background, influences, development
3. Technique and approach — how they work, what makes it distinctive
4. Themes and philosophy — what drives them, what they explore
5. Current standing — where they are now, gallery representation

Write in third person. Editorial tone, not marketing tone.
Must feel like a gallery biography, not a sales pitch.""",

    "general": """FORMAT: GENERAL COPY
Length: 300-450 words (hard requirement — do not go shorter)
Paragraphs: 4-6

Hybrid of overview and soft call-to-action.
No "Notes to Editors" unless explicitly requested.
Write narratively — atmosphere first, facts woven in.""",

    "paid_ads": """FORMAT: PAID ADVERTISING COPY
Generate multiple ad variants for both Meta and Google.

META ADS (generate 5 variants of each):
- Body copy: 50-150 characters each
- Headline: max 27 characters each

GOOGLE ADS (generate 5 variants of each):
- Headlines: max 30 characters each
- Descriptions: max 90 characters each

Rules:
- Every variant must be within the character limits (count carefully)
- Each variant should take a different angle (emotion, technique, place, legacy, urgency)
- Match the artist's voice but compressed — punchy, evocative, no filler
- Include at least one variant with a clear call-to-action
- No quotation marks in ad copy
- British English throughout

Output format:
META ADS
Body Copy:
1. [copy] (X chars)
2. [copy] (X chars)
...
Headlines:
1. [copy] (X chars)
2. [copy] (X chars)
...

GOOGLE ADS
Headlines:
1. [copy] (X chars)
2. [copy] (X chars)
...
Descriptions:
1. [copy] (X chars)
2. [copy] (X chars)
...""",
}


class CopyGeneratorV2:
    """
    Generates copy with vision support.
    """

    def __init__(self, api_key: str):
        self.openai = OpenAI(api_key=api_key)

    def generate(
        self,
        style_guide: str,
        doc_type: str,
        context: str,
        images: list[dict] = None
    ) -> str:
        """
        Generate copy in the analyzed style.

        Args:
            style_guide: Natural language style guide from analysis
            doc_type: Type of document (press_release, bio, collection_overview, paid_ads)
            context: User-provided context about what to write
            images: List of dicts with 'bytes' and 'description' keys

        Returns:
            Generated copy
        """
        format_rules = FORMAT_RULES.get(doc_type, FORMAT_RULES["general"])

        # Build the message content
        content = []

        # Text prompt
        prompt = f"""You are writing copy for Castle Fine Art gallery.

Below is a STYLE GUIDE that describes HOW to write — the voice, tone, structure,
cadence, and narrative devices to use. It was derived from previous documents about
this artist.

--- STYLE GUIDE (voice and structure rules only) ---
{style_guide}
--- END STYLE GUIDE ---

Below is the USER BRIEF — this is the ONLY source of facts for the copy you write.
Every specific detail (collection name, artwork titles, subjects depicted, prices,
charity information, exhibition dates) must come from the brief below or from
the attached images. Do NOT recycle specific facts, charity amounts, collection
names, or event details from the style guide — those are from past campaigns.

--- USER BRIEF ---
{context}
--- END USER BRIEF ---

--- OUTPUT REQUIREMENTS (mandatory — do not ignore) ---
{format_rules}
--- END OUTPUT REQUIREMENTS ---

Additional rules:
1. Follow the style guide for voice, tone, and cadence
2. Use ONLY facts from the user brief and images — do not invent details
3. If key facts are missing, write around them with general language rather than placeholders or invented details
4. Refer to the gallery as "Castle Fine Art" (never "Castle Galleries")
5. Use British English throughout (colour, favour, centre, catalogue)
6. No generic filler ("stunning", "amazing", "check out", "awesome")
7. For pricing, use "priced at £X" or "available at £X" (only if prices are in the brief)
8. If the output reads like a short marketing blurb, it is wrong — expand with narrative detail

Write now."""

        content.append({
            "type": "text",
            "text": prompt
        })

        # Add images if provided
        if images:
            for img in images:
                base64_image = encode_image_to_base64(img['bytes'])
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}",
                        "detail": "high"
                    }
                })

        response = self.openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": content
                }
            ],
            temperature=0.7,
            max_tokens=4000
        )

        return response.choices[0].message.content.strip()

    def generate_with_conversation(
        self,
        style_guide: str,
        user_prompt: str,
        images: list[dict] = None
    ) -> str:
        """
        Even simpler - just pass through a natural prompt.

        Args:
            style_guide: Natural language style guide
            user_prompt: The user's natural language request
            images: Optional images to include

        Returns:
            Generated copy
        """
        content = []

        # Combine style guide with user prompt
        full_prompt = f"""I've previously analyzed an artist's writing style. Here it is:

--- STYLE GUIDE ---
{style_guide}
--- END STYLE GUIDE ---

Now here's my request:

{user_prompt}

IMPORTANT: Use British English and refer to the gallery as "Castle Fine Art"."""

        content.append({
            "type": "text",
            "text": full_prompt
        })

        # Add images if provided
        if images:
            for img in images:
                base64_image = encode_image_to_base64(img['bytes'])
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}",
                        "detail": "high"
                    }
                })

        response = self.openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": content
                }
            ],
            temperature=0.7,
            max_tokens=3000
        )

        return response.choices[0].message.content.strip()
