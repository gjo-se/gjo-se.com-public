"""Unit tests for the eval auto-trigger event listeners."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.shared.llm_gateway.event_listeners import (
    _enqueue_if_model_or_config_changed,
    register_eval_triggers,
)


class _History:
    """Minimal SQLAlchemy attribute-history double."""

    def __init__(self, changed: bool) -> None:
        self._changed = changed

    def has_changes(self) -> bool:
        """Return whether the attribute changed."""
        return self._changed


class _TrackedAttr:
    """Attribute double exposing a change history."""

    def __init__(self, changed: bool) -> None:
        self.history = _History(changed)


class _InstanceInspector:
    """Stand-in for ``sqlalchemy.inspect(target)`` with tracked attributes."""

    def __init__(self, model_changed: bool, config_changed: bool) -> None:
        self.attrs = SimpleNamespace(
            model_id=_TrackedAttr(model_changed),
            hyperparameters=_TrackedAttr(config_changed),
        )


@pytest.fixture()
def enqueue_recorder(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str]]:
    """Replace the eval enqueue with a recorder and return the recorded calls."""
    calls: list[tuple[str, str]] = []

    async def fake_enqueue(task_key: str, trigger: str) -> None:
        calls.append((task_key, trigger))

    monkeypatch.setattr(
        "app.shared.workflow_runtime.infrastructure.restate.dispatch.enqueue_eval_task",
        fake_enqueue,
    )
    return calls


@pytest.mark.unit
async def test_model_id_change_enqueues_eval_with_model_change_trigger(
    monkeypatch: pytest.MonkeyPatch,
    enqueue_recorder: list[tuple[str, str]],
) -> None:
    """A model_id change enqueues an evaluation run labelled model_change."""
    monkeypatch.setattr("sqlalchemy.inspect", lambda _target: _InstanceInspector(True, False))
    target = SimpleNamespace(task="description-merge")

    await _enqueue_if_model_or_config_changed(target)

    assert enqueue_recorder == [("description-merge", "model_change")]


@pytest.mark.unit
async def test_hyperparameter_change_enqueues_eval_with_config_change_trigger(
    monkeypatch: pytest.MonkeyPatch,
    enqueue_recorder: list[tuple[str, str]],
) -> None:
    """A hyperparameter change enqueues an evaluation run labelled config_change."""
    monkeypatch.setattr("sqlalchemy.inspect", lambda _target: _InstanceInspector(False, True))
    target = SimpleNamespace(task="description-merge")

    await _enqueue_if_model_or_config_changed(target)

    assert enqueue_recorder == [("description-merge", "config_change")]


@pytest.mark.unit
async def test_unchanged_row_enqueues_nothing(
    monkeypatch: pytest.MonkeyPatch,
    enqueue_recorder: list[tuple[str, str]],
) -> None:
    """Without a model or config change no evaluation is enqueued."""
    monkeypatch.setattr("sqlalchemy.inspect", lambda _target: _InstanceInspector(False, False))
    target = SimpleNamespace(task="description-merge")

    await _enqueue_if_model_or_config_changed(target)

    assert enqueue_recorder == []


@pytest.mark.unit
def test_register_eval_triggers_is_idempotent(monkeypatch: pytest.MonkeyPatch) -> None:
    """Registering the eval triggers twice attaches the listener only once."""
    registrations: list[tuple[object, str]] = []

    def fake_listens_for(target: object, identifier: str):
        def decorator(fn: object) -> object:
            registrations.append((target, identifier))
            return fn

        return decorator

    monkeypatch.setattr("sqlalchemy.event.listens_for", fake_listens_for)

    register_eval_triggers()
    register_eval_triggers()

    assert len(registrations) == 1
