"""Context-wide exception types of the ``fbf`` bounded context."""


class TaskExecutionError(Exception):
    """Raised when :meth:`TaskExecutorService.execute_task` returns ``success=False``.

    Carries the standardised ``error_type`` string so callers (e.g. ``backfill``)
    can classify failures without importing ``classify_exception``.
    """

    def __init__(self, error_type: str) -> None:
        self.error_type = error_type
        super().__init__(f"Task execution failed: {error_type}")
