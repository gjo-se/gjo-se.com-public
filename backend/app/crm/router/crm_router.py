"""CRM router aggregation – mounts all CRM sub-routers under ``crm_router``."""

from fastapi import APIRouter

from app.crm.router.address_router import router as address_router
from app.crm.router.company_address_router import router as company_address_router
from app.crm.router.company_enrich_router import router as company_enrich_router
from app.crm.router.company_router import router as company_router
from app.crm.router.person_detail_router import router as person_detail_router
from app.crm.router.person_router import router as person_router
from app.crm.router.project_person_router import router as project_person_router

crm_router = APIRouter()
crm_router.include_router(company_router, tags=["crm · companies · admin"])
crm_router.include_router(company_address_router, tags=["crm · companies · admin"])
crm_router.include_router(company_enrich_router, tags=["crm · companies · admin"])
crm_router.include_router(person_router, tags=["crm · persons · admin"])
crm_router.include_router(person_detail_router, tags=["crm · persons · admin"])
crm_router.include_router(address_router, tags=["crm · addresses · admin"])
crm_router.include_router(project_person_router, tags=["crm · project-persons · admin"])
