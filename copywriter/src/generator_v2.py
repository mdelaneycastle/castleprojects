"""
Generator V2 - Simplified ChatGPT-like approach
Uses GPT-4o with natural conversation flow for better results.
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
    Mimics how you'd ask ChatGPT to analyze writing style.
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


class CopyGeneratorV2:
    """
    Generates copy using GPT-4o with vision.
    Simple, conversational approach like ChatGPT.
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
            doc_type: Type of document (press_release, bio, collection_overview)
            context: User-provided context about what to write
            images: List of dicts with 'bytes' and 'description' keys

        Returns:
            Generated copy
        """

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

Write a {doc_type.replace('_', ' ')} that:
1. Follows the style guide for voice, tone, structure, and cadence
2. Uses ONLY the facts provided in the user brief and images above
3. Does not invent facts that are not in the brief (if details are missing, leave them out or use general language)
4. Refers to the gallery as "Castle Fine Art" (never "Castle Galleries")
5. Uses British English throughout (colour, favour, centre, catalogue)
6. Avoids American expressions ("price tag", "check out", "awesome", "amazing")
7. For pricing, uses "priced at £X" or "available at £X" (only if prices are provided in the brief)

Write the {doc_type.replace('_', ' ')} now."""

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
            max_tokens=3000
        )

        return response.choices[0].message.content.strip()

    def generate_with_conversation(
        self,
        style_guide: str,
        user_prompt: str,
        images: list[dict] = None
    ) -> str:
        """
        Even simpler - just pass through a natural prompt like you would to ChatGPT.

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
