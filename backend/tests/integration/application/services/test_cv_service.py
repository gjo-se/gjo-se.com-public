"""Integration tests for the public CV-builder helpers.

The CV service is DB-coupled (integration level); these tests pin the public,
side-effect-free file-name contract that recruiters/ATS actually see:
``build_cv_filename`` and ``cv_filename_from_context``.
"""

from __future__ import annotations

import pytest

from app.application.services import cv_service

pytestmark = pytest.mark.integration


def test_build_cv_filename_orders_name_reference_title() -> None:
    """The file name follows ``<Name>_<Referenz>_<Titel>.pdf``."""
    filename = cv_service.build_cv_filename("Greg Erdmann", "Data Architect", "3049737")

    assert filename == "Greg_Erdmann_3049737_Data_Architect.pdf"


def test_build_cv_filename_appends_marker_without_title_and_reference() -> None:
    """The project-less CV gets the ``Lebenslauf`` document marker."""
    assert cv_service.build_cv_filename("Greg Erdmann") == "Greg_Erdmann_Lebenslauf.pdf"


def test_build_cv_filename_transliterates_umlauts() -> None:
    """Umlauts use the German transliteration in the name segment."""
    assert cv_service.build_cv_filename("Jürgen Öl") == "Juergen_Oel_Lebenslauf.pdf"


def test_build_cv_filename_spells_out_risky_title_characters() -> None:
    """``C++``/``C#`` are spelled out so the file name stays upload-safe."""
    filename = cv_service.build_cv_filename("A B", "C++ / C#")

    assert filename == "A_B_Cpp_Csharp.pdf"


def test_build_cv_filename_truncates_a_long_name_on_a_word_boundary() -> None:
    """An over-long name is truncated without a trailing separator."""
    filename = cv_service.build_cv_filename("A" * 100)

    assert filename == "A" * 60 + "_Lebenslauf.pdf"


def test_cv_filename_from_context_uses_normalized_title_and_reference() -> None:
    """The context-derived name prefers the normalized title and the reference."""
    context = {
        "profile": {"full_name": "Greg Erdmann"},
        "project": {"title": "Roh", "title_normalized": "Data Architect", "reference": "3049737"},
    }

    assert cv_service.cv_filename_from_context(context) == "Greg_Erdmann_3049737_Data_Architect.pdf"


def test_cv_filename_from_context_falls_back_to_raw_title_without_normalized() -> None:
    """Without a normalized title the raw project title is used."""
    context = {"profile": {"full_name": "Greg Erdmann"}, "project": {"title": "Data Architect", "reference": None}}

    assert cv_service.cv_filename_from_context(context) == "Greg_Erdmann_Data_Architect.pdf"


def test_cv_filename_from_context_without_project_uses_the_marker() -> None:
    """A project-less context yields the ``Lebenslauf`` file name."""
    context = {"profile": {"full_name": "Greg Erdmann"}, "project": None}

    assert cv_service.cv_filename_from_context(context) == "Greg_Erdmann_Lebenslauf.pdf"
