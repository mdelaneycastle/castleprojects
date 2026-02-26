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
- 25-40 reusable phrases/stems pulled directly from the source material, grouped by function:
  openers / transitions / technique / emotion / context / closers / calls-to-action

7) Reusable Templates
A) Press release template (with bracket placeholders)
B) Product description template (shorter)
C) 50-word "gallery caption" template

8) Style Stress Test
- 6 common mistakes writers make when trying this voice, and how to fix them

9) Two mini sample paragraphs (style-only demonstration)
- One "press release opening" paragraph (80-120 words)
- One "product description" paragraph (60-90 words)

Important:
- Do not invent biographical facts that aren't in the documents.
- When in doubt, generalise safely rather than fabricating specifics.
- Every rule and example must be traceable back to something in the corpus."""

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
        prompt = f"""Here is a detailed style guide based on previous writing about this artist:

--- STYLE GUIDE ---
{style_guide}
--- END STYLE GUIDE ---

Now, using this exact style, write a {doc_type.replace('_', ' ')} based on the following:

{context}

IMPORTANT:
- Always refer to the gallery as "Castle Fine Art" (never "Castle Galleries")
- Use British English throughout (colour, favour, centre, catalogue)
- Never use American expressions like "price tag", "check out", "awesome", "amazing"
- For pricing, say "priced at £X" or "available at £X"

Write the {doc_type.replace('_', ' ')} now, matching the style guide closely."""

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
