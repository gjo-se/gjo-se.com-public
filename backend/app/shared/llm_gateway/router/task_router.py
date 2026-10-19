"""Aggregator for the LLM task admin routers.

Each responsibility (listing, mapping, execution, evaluation, dataset
promotion, observer stats) lives in its own route module; this module only
composes them onto one ``task_router`` (see ``admin_router`` in
``llm_router``).
"""

from __future__ import annotations

from fastapi import APIRouter

from app.shared.llm_gateway.router.call_log_promote_router import router as call_log_promote_router
from app.shared.llm_gateway.router.task_eval_router import router as task_eval_router
from app.shared.llm_gateway.router.task_execute_router import router as task_execute_router
from app.shared.llm_gateway.router.task_list_router import router as task_list_router
from app.shared.llm_gateway.router.task_mapping_router import router as task_mapping_router
from app.shared.llm_gateway.router.task_observer_router import router as task_observer_router

task_router = APIRouter()
task_router.include_router(task_list_router)
task_router.include_router(task_mapping_router)
task_router.include_router(task_execute_router)
task_router.include_router(task_eval_router)
task_router.include_router(call_log_promote_router)
task_router.include_router(task_observer_router)
