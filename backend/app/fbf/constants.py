"""Shared constants of the ``fbf`` bounded context.

Two groups: the ``freelancermap.de`` scraping endpoints/page bounds (consumed by
``FreelancermapScrapingService``) and the ``SkillTagName`` tag vocabulary (SSOT
for the LLM skill extraction).
"""

from enum import StrEnum

#: Portal base URL – all endpoints and project links are built from it.
BASE_URL = "https://www.freelancermap.de"

#: Search results page: loaded once per role to initialise the PHP session.
SEARCH_URL = BASE_URL + "/projekte?query={query}&countries[]=1&countries[]=2&countries[]=3&sort=1&pagenr=1"

#: AJAX endpoint – returns JSON; requires an active PHP session (via Playwright context).
AJAX_URL = (
    BASE_URL + "/project/search/ajax?query={query}&countries[]=1&countries[]=2&countries[]=3&sort=1&pagenr={page}"
)

#: Fallback page size when the AJAX response does not report an own page length.
AJAX_PAGE_SIZE = 22

#: Safety ceiling for the number of AJAX pages fetched per search term.
MAX_PAGES = 20


class SkillTagName(StrEnum):
    """Vordefinierte Tag-Namen (Enum, SSOT – 12 Werte, kein Freitext).

    Die Liste wird einmalig kuratiert; neue Tags werden manuell ergaenzt.
    Das LLM waehlt bei der Extraktion ausschliesslich aus dieser Liste.
    """

    LANGUAGE = "language"
    FRAMEWORK = "framework"
    CLOUD = "cloud"
    TOOL = "tool"
    AI = "ai"
    DATA = "data"
    SECURITY = "security"
    TESTING = "testing"
    DEVOPS = "devops"
    CONCEPT = "concept"
    METHOD = "method"
    DOMAIN = "domain"
