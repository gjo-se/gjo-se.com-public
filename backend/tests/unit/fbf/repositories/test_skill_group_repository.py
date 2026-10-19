"""Unit-Tests für das Skill-Group-Repository (öffentliches Interface).

Prüft den öffentlichen Vertrag des Group-Repositories: jede Gruppe-Query ist als
async-Funktion vorhanden (der DB-Zugriff selbst wird auf Integrationsebene
abgesichert).
"""

from __future__ import annotations

import inspect

import pytest

from app.fbf.repositories import skill_group_repository as repo

pytestmark = pytest.mark.unit

_GROUP_FUNCTIONS = [
    "get_public_groups",
    "get_groups_with_translations",
    "update_group",
    "reorder_groups",
    "get_group_by_id",
    "delete_group",
    "create_group",
]


@pytest.mark.parametrize("name", _GROUP_FUNCTIONS)
def test_group_repository_exposes_async_function(name: str) -> None:
    """Every group query is exposed as an async coroutine function."""
    fn = getattr(repo, name, None)
    assert fn is not None, f"{name} fehlt im Group-Repository"
    assert inspect.iscoroutinefunction(fn), f"{name} muss async sein"
