"""Profile-header mapping for the application CV (gjo_se_com).

Maps the singleton application profile to the flat ``profile`` block of the
Jinja2 CV context – including the project-aware ``Remote/Onsite`` and
``Verfügbar ab`` values and the quoted hourly rate. Pure formatting; the
orchestration lives in :mod:`cv_context_service`.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

from app.application.domain import application_onsite_rules
from app.application.schemas.profile_schemas import ProfileOut
from app.application.services import start_service

#: On-site clause appended to the remote value when the posting requires
#: presence. Greg's declarative on-site tolerance ("Deckel") – a single fact,
#: rendered in the CV ``Remote/Onsite`` field, not a scoring input. No region
#: suffix: the employer only needs to know that on-site presence is possible.
_CV_ONSITE_CLAUSE = "onsite bis 1 Tag/Woche"

#: Contract-model fact rendered in the CV ``Einsatzform`` field. Greg works
#: exclusively freelance – ANÜ/permanent are blockers, so the statement doubles
#: as a deliberate pre-filter. Same axis as the score criterion ``contract_match``.
_CV_CONTRACT_STATEMENT = "freiberuflich (kein ANÜ)"

#: Availability value rendered when the profile's ``available_from`` is already
#: reached and the posting requires no later start: a concrete past date would
#: only understate Greg's availability, while "sofort" is the ATS keyword.
_CV_IMMEDIATE_AVAILABILITY = "sofort"

#: Availability and hourly-rate value rendered in the project-less CV. Handed
#: out without a concrete engagement, both hard facts are stated as "on
#: request" – same policy as the public About page, which keeps the concrete
#: values admin-only.
_CV_ON_REQUEST = "auf Anfrage"

#: Currency of the quoted hourly rate by project location country (keys are the
#: lower-cased ``project.country`` values, which are German country names).
#: Switzerland is quoted in CHF; any other (or missing) country keeps the
#: profile currency. The rate value is curated per project, so only the currency
#: label follows the location.
_RATE_CURRENCY_BY_COUNTRY: dict[str, str] = {
    "schweiz": "CHF",
    "switzerland": "CHF",
}


def _format_date(value: date | None) -> str | None:
    """Formats an optional date as ``DD.MM.YYYY`` for the conditions block."""
    return value.strftime("%d.%m.%Y") if value is not None else None


def _format_hourly_rate(
    profile: ProfileOut,
    *,
    project_rate: int | None = None,
    currency: str | None = None,
) -> str | None:
    """Formats the effective hourly rate as ``"95 EUR / Stunde"`` (or ``None``).

    The currency is rendered as its ISO code (``EUR``) rather than a symbol
    (``€``): ATS parsers can garble symbol glyphs, and ATS guides recommend
    spelling out the currency instead. ``currency`` overrides the profile's
    ``hourly_rate_currency`` – the project CV quotes the rate in the project
    location's currency (e.g. ``CHF`` for Switzerland, see
    :func:`_resolve_rate_currency`). The project-specific own rate
    (``project.my_hourly_rate``) takes precedence over the profile default when
    set; otherwise the profile rate plus its currency is used. The project CV
    therefore quotes the rate curated for that project, while the project-less
    CV keeps the profile default.
    """
    resolved = (currency or profile.hourly_rate_currency or "EUR").upper()
    if project_rate is not None:
        return f"{project_rate} {resolved} / Stunde"
    rate = profile.hourly_rate
    if rate is None:
        return None
    amount = f"{rate:.0f}" if rate == rate.to_integral_value() else f"{rate:.2f}"
    return f"{amount} {resolved} / Stunde"


def _resolve_rate_currency(profile: ProfileOut, country: str | None) -> str:
    """Returns the ISO currency for the quoted rate based on the project country.

    The rate value is curated per project; only its currency label follows the
    project's location country (:data:`_RATE_CURRENCY_BY_COUNTRY`). Any country
    without an explicit mapping – or a missing country – keeps the profile
    currency (``EUR`` by default).
    """
    if country:
        mapped = _RATE_CURRENCY_BY_COUNTRY.get(country.strip().casefold())
        if mapped:
            return mapped
    return (profile.hourly_rate_currency or "EUR").upper()


def _build_remote_value(
    profile: ProfileOut,
    *,
    posting_text: str | None,
    field_percent: int | None,
) -> str | None:
    """Builds the CV ``Remote/Onsite`` value (project-aware).

    The base value is the profile's ``remote`` fact. When the posting requires
    on-site presence (resolved from the text first, then the structured field),
    Greg's on-site tolerance clause is appended – otherwise the base value is
    left untouched.
    """
    base = profile.remote
    if not base:
        return base
    percent, _source = application_onsite_rules.resolve_required_remote_percent(
        text=posting_text,
        field_percent=field_percent,
    )
    if application_onsite_rules.requires_onsite(percent):
        return f"{base} · {_CV_ONSITE_CLAUSE}"
    return base


def _build_available_from(
    profile: ProfileOut,
    *,
    required: start_service.RequiredStart | None,
    today: date | None = None,
) -> str | None:
    """Builds the CV ``Verfügbar ab`` value (project-aware).

    The required start resolves from the posting text first, then the structured
    ``project.start_date`` field. When it lies **after** the profile's
    ``available_from`` it is mirrored verbatim – maximal ATS overlap with the
    posting, and never a false promise (Greg is available by that date). When it
    does not, the profile date governs; a date already reached renders as
    ``sofort`` instead of a past date.
    """
    available_from = profile.available_from
    if available_from is not None and required is not None and required.value > available_from:
        return start_service.render_start(required)
    if available_from is None:
        return None
    if available_from <= (today or datetime.now(UTC).date()):
        return _CV_IMMEDIATE_AVAILABILITY
    return _format_date(available_from)


def _build_profile(
    profile: ProfileOut,
    *,
    project_rate: int | None = None,
    remote_value: str | None = None,
    available_from: str | None = None,
    on_request: bool = False,
    currency: str | None = None,
) -> dict[str, object]:
    """Maps the singleton profile to the flat template dict.

    ``project_rate`` overrides the profile's ``hourly_rate`` for the project CV.
    ``remote_value`` overrides the profile's ``remote`` fact with the
    project-aware ``Remote/Onsite`` value; ``None`` keeps the profile fact.
    ``available_from`` is the pre-computed, project-aware availability string
    (see :func:`_build_available_from`). ``on_request`` renders availability and
    hourly rate as "auf Anfrage" instead of the concrete profile values – used
    by the project-less CV, which is handed out without an engagement.
    ``currency`` overrides the profile's ``hourly_rate_currency`` for the quoted
    rate (project-location currency, e.g. ``CHF``).
    """
    return {
        "full_name": profile.full_name,
        "headline": profile.headline,
        "email": profile.email,
        "phone": profile.phone,
        "location": profile.location,
        "website_url": profile.website_url,
        "github_url": profile.github_url,
        "linkedin_url": profile.linkedin_url,
        "remote": remote_value if remote_value is not None else profile.remote,
        "contract_type": _CV_CONTRACT_STATEMENT,
        "available_from": _CV_ON_REQUEST if on_request else available_from,
        "hourly_rate": (
            _CV_ON_REQUEST if on_request else _format_hourly_rate(profile, project_rate=project_rate, currency=currency)
        ),
    }


def build_profile_context(
    profile: ProfileOut,
    *,
    project_rate: int | None = None,
    posting_text: str | None = None,
    field_percent: int | None = None,
    required_start: start_service.RequiredStart | None = None,
    on_request: bool = False,
    country: str | None = None,
) -> dict[str, object]:
    """Builds the flat ``profile`` block of the CV context.

    Combines the project-aware ``Remote/Onsite`` value, the resolved
    availability and the quoted hourly rate into the template dict.

    Args:
        profile: The singleton application profile.
        project_rate: Project-specific own rate (``project.my_hourly_rate``).
        posting_text: Project posting text (on-site detection source).
        field_percent: Structured remote percent of the project.
        required_start: Resolved required start of the posting (or ``None``).
        on_request: Render availability/rate as "auf Anfrage" (project-less CV).
        country: Project location country (rate-currency selection).

    Returns:
        The ``profile`` mapping consumed by the ``cv`` PDF template.
    """
    remote_value = _build_remote_value(profile, posting_text=posting_text, field_percent=field_percent)
    available_from = _build_available_from(profile, required=required_start)
    return _build_profile(
        profile,
        project_rate=project_rate,
        remote_value=remote_value,
        available_from=available_from,
        on_request=on_request,
        currency=_resolve_rate_currency(profile, country),
    )
