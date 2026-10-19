"""Session factory for the on-demand node-summary LLM call (viscera).

Owns the isolated DB session handed to the shared LLM gateway's
``TaskExecutorService`` so :mod:`node_summary_service` opens no session itself
(Achse 2: ``services`` > ``repositories``; strict K3). Mirrors the
``diagnose_repository.open_session`` pattern from INC 7 (#4154).
"""

from app.shared.db_access import session as _db_session

open_session = _db_session.open_session
