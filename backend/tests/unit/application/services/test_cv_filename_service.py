"""Unit tests for the recruiter-friendly CV file-name builder.

The file name is the attachment label recruiters and ATS see
(``<Name>_<Referenz>_<Titel>.pdf``): German transliteration, URL/ATS-safe title
spelling and word-boundary truncation. Pure string work – every assertion pins a
concrete file name, no I/O and no database.
"""

from __future__ import annotations

import pytest

from app.application.services import cv_filename_service

pytestmark = pytest.mark.unit


def test_build_cv_filename_orders_name_reference_and_title() -> None:
    """The file name follows the ``<Name>_<Referenz>_<Titel>.pdf`` convention."""
    filename = cv_filename_service.build_cv_filename("Greg Erdmann", "Data Architect", "3049737")

    assert filename == "Greg_Erdmann_3049737_Data_Architect.pdf"


def test_build_cv_filename_appends_marker_without_title_and_reference() -> None:
    """The project-less CV gets the ``Lebenslauf`` document marker."""
    assert cv_filename_service.build_cv_filename("Greg Erdmann") == "Greg_Erdmann_Lebenslauf.pdf"


def test_build_cv_filename_transliterates_umlauts_in_the_name() -> None:
    """Umlauts use the German transliteration in the name segment."""
    assert cv_filename_service.build_cv_filename("Jürgen Öl") == "Juergen_Oel_Lebenslauf.pdf"


def test_build_cv_filename_spells_out_risky_title_characters() -> None:
    """``C++``/``C#`` are spelled out so the file name stays upload-safe."""
    filename = cv_filename_service.build_cv_filename("A B", "C++ / C#")

    assert filename == "A_B_Cpp_Csharp.pdf"


def test_build_cv_filename_drops_a_bare_project_number_hash() -> None:
    """A ``#`` without a preceding letter (project number) is dropped."""
    filename = cv_filename_service.build_cv_filename("A B", "Data #3277")

    assert filename == "A_B_Data_3277.pdf"


def test_build_cv_filename_truncates_a_long_name_on_a_word_boundary() -> None:
    """An over-long name is truncated without a trailing separator."""
    filename = cv_filename_service.build_cv_filename("A" * 100)

    assert filename == "A" * 60 + "_Lebenslauf.pdf"


def test_build_cv_filename_truncates_a_long_title_to_sixty_characters() -> None:
    """An over-long title segment is capped so the label stays readable."""
    filename = cv_filename_service.build_cv_filename("A B", "C" * 100)

    assert filename == "A_B_" + "C" * 60 + ".pdf"


def test_build_cv_filename_truncates_a_long_reference_to_twenty_characters() -> None:
    """An over-long reference id is capped in the reference segment."""
    filename = cv_filename_service.build_cv_filename("A B", None, "R" * 30)

    assert filename == "A_B_" + "R" * 20 + ".pdf"


def test_cv_filename_from_context_uses_normalized_title_and_reference() -> None:
    """The context-derived name prefers the normalized title and the reference."""
    context = {
        "profile": {"full_name": "Greg Erdmann"},
        "project": {"title": "Roh", "title_normalized": "Data Architect", "reference": "3049737"},
    }

    assert cv_filename_service.cv_filename_from_context(context) == "Greg_Erdmann_3049737_Data_Architect.pdf"


def test_cv_filename_from_context_falls_back_to_raw_title_without_normalized() -> None:
    """Without a normalized title the raw project title is used."""
    context = {"profile": {"full_name": "Greg Erdmann"}, "project": {"title": "Data Architect", "reference": None}}

    assert cv_filename_service.cv_filename_from_context(context) == "Greg_Erdmann_Data_Architect.pdf"


def test_cv_filename_from_context_without_project_uses_the_marker() -> None:
    """A project-less context yields the ``Lebenslauf`` file name."""
    context = {"profile": {"full_name": "Greg Erdmann"}, "project": None}

    assert cv_filename_service.cv_filename_from_context(context) == "Greg_Erdmann_Lebenslauf.pdf"


def test_cv_filename_from_context_ignores_a_non_string_title() -> None:
    """A non-string title (bad data) falls through to the document marker."""
    context = {"profile": {"full_name": "Greg Erdmann"}, "project": {"title": 123, "reference": None}}

    assert cv_filename_service.cv_filename_from_context(context) == "Greg_Erdmann_Lebenslauf.pdf"


def test_cv_filename_from_context_uses_reference_without_any_title() -> None:
    """A reference without a title still yields the reference segment (no marker)."""
    context = {
        "profile": {"full_name": "Greg Erdmann"},
        "project": {"title": None, "title_normalized": None, "reference": "3049737"},
    }

    assert cv_filename_service.cv_filename_from_context(context) == "Greg_Erdmann_3049737.pdf"
