"""Recruiter-friendly file names for the application CV (gjo_se_com).

Builds the CV download file name from the profile name, the curated title and
the freelancermap reference – URL/ATS-safe, with German transliteration. Pure
string work; the render path lives in :mod:`cv_document_service`.
"""

from __future__ import annotations

import re
import unicodedata

#: Document-type marker used only when the file name has neither title nor
#: reference (project-less CV): ``<Name>_Lebenslauf.pdf``.
_CV_NAME_PART = "Lebenslauf"
#: Upper bounds (characters) for the name/title/reference sections of the file name.
_CV_NAME_MAX_LENGTH = 60
_CV_TITLE_MAX_LENGTH = 60
_CV_REFERENCE_MAX_LENGTH = 20
#: German transliteration for the file name (``ä`` → ``ae`` before NFKD).
_CV_TRANSLITERATION = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "Ä": "Ae", "Ö": "Oe", "Ü": "Ue", "ß": "ss"})


def _slugify(value: str, max_length: int) -> str:
    """Returns an ASCII-only, ``_``-separated slug, truncated on a word boundary.

    Umlauts use the German transliteration (``ä`` → ``ae``, ``ß`` → ``ss``),
    remaining diacritics are removed via NFKD; every non-alphanumeric run
    collapses to a single ``_``.
    """
    transliterated = value.translate(_CV_TRANSLITERATION)
    normalized = unicodedata.normalize("NFKD", transliterated)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^A-Za-z0-9]+", "_", ascii_value).strip("_")
    if len(slug) <= max_length:
        return slug
    truncated = slug[:max_length]
    if "_" in truncated:
        truncated = truncated[: truncated.rfind("_")]
    return truncated.strip("_")


def _title_slug(title_normalized: str | None) -> str:
    """Transliterates the curated title into a URL/ATS-safe file-name segment.

    Wording is identical to the mail subject role segment; only characters that
    are risky in file names, URLs (``#`` is the URI fragment delimiter) or ATS
    uploads are spelled out: ``C++`` → ``Cpp``, ``C#`` → ``Csharp``, a bare
    ``#`` (project number) is dropped, everything else non-alphanumeric
    collapses to ``_``.
    """
    if not title_normalized:
        return ""
    transliterated = title_normalized.replace("++", "pp")
    transliterated = re.sub(r"(?<=[A-Za-z])#", "sharp", transliterated)
    transliterated = transliterated.replace("#", "")
    return _slugify(transliterated, _CV_TITLE_MAX_LENGTH)


def build_cv_filename(
    full_name: str,
    title_normalized: str | None = None,
    reference: str | None = None,
) -> str:
    """Builds a recruiter-friendly CV file name.

    Convention (recruiter guidance + freelancer project applications), segment
    order mirrors the mail subject (name – reference – title):
    ``<Vorname>_<Nachname>_<Referenznummer>_<Title Normalized>.pdf``, e.g.
    ``Gregory_Jo_Erdmann_3049737_Data_Architect_Cpp_Java_und_Python_3277.pdf``.
    The title segment is URL/ATS-safe (``C++`` → ``Cpp``, ``#`` dropped), all
    other special characters become ``_``, umlauts are transliterated, and
    title/reference are truncated so the attachment label stays readable. The
    document-type marker (``Lebenslauf``) is only appended when neither a title
    nor a reference is present – the project-less CV, ``<Name>_Lebenslauf.pdf``.

    Args:
        full_name: Candidate name from the application profile.
        title_normalized: Curated application title (same value as the mail
            subject role segment), falling back to the project title.
        reference: Public freelancermap project id.

    Returns:
        The file name including the ``.pdf`` suffix.
    """
    name = _slugify(full_name, _CV_NAME_MAX_LENGTH)
    reference_slug = _slugify(reference or "", _CV_REFERENCE_MAX_LENGTH)
    title_slug = _title_slug(title_normalized)
    parts = [part for part in (name, reference_slug, title_slug) if part]
    if not title_slug and not reference_slug:
        parts.append(_CV_NAME_PART)
    return "_".join(parts) + ".pdf"


def cv_filename_from_context(context: dict[str, object]) -> str:
    """Derives the CV file name from a built CV context.

    Args:
        context: Context produced by
            :func:`cv_context_service.build_application_cv_context`.

    Returns:
        The file name including the ``.pdf`` suffix.
    """
    profile = context.get("profile")
    full_name = profile.get("full_name") if isinstance(profile, dict) else None
    project = context.get("project")
    project = project if isinstance(project, dict) else {}
    title_normalized = project.get("title_normalized")
    title = project.get("title")
    reference = project.get("reference")
    return build_cv_filename(
        str(full_name or ""),
        (title_normalized if isinstance(title_normalized, str) else (title if isinstance(title, str) else None)),
        reference if isinstance(reference, str) else None,
    )
