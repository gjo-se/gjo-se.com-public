"""crm adapter for the shared CRM contact port (import-linter Group G + H).

Implements :class:`app.shared.ports.crm_contact.CrmContactPort` by composing four
cohesive adapter components (primary-contact reads, endcustomer onboarding,
contact-block check, project-link move) so the application and fbf contexts can
resolve project contacts, onboard an endcustomer contact and move CRM links
without importing ``app.crm``. Wired at the composition root (``app/main.py``).
"""

from __future__ import annotations

from app.crm.infrastructure.hunter_client import HunterClientFactory
from app.crm.services.contact_block_adapter import CrmContactBlockChecks
from app.crm.services.contact_link_adapter import CrmContactLinkMover
from app.crm.services.contact_onboarding_adapter import CrmContactOnboarding
from app.crm.services.contact_queries_adapter import CrmContactQueries
from app.shared.ports.crm_contact import CrmContactPort


class CrmContactAdapter(
    CrmContactQueries,
    CrmContactOnboarding,
    CrmContactBlockChecks,
    CrmContactLinkMover,
):
    """CRM contact operations consumed by the application and fbf contexts.

    The Hunter client factory is provided via :class:`CrmContactOnboarding`
    (the only component that needs it).
    """


def build_crm_contact_adapter(hunter_client_factory: HunterClientFactory) -> CrmContactPort:
    """Build the wired CRM contact port adapter (composition helper).

    Args:
        hunter_client_factory: Composition-root provider used to build the
            Hunter.io client for endcustomer company enrichment.

    Returns:
        The CRM contact port adapter implementing all six port operations.
    """
    return CrmContactAdapter(hunter_client_factory)
