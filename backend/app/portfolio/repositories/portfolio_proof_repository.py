"""Database access for portfolio proof reads and writes (gjo_se_com).

Owns the 1:N proof sub-resource of a portfolio (CRUD, ordering and the
translation-table pattern for statements/questions). Portfolio-level reads and
writes live in :mod:`portfolio_repository`.
"""

from sqlalchemy import delete as delete_stmt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.portfolio.domain.portfolio_contract import ProofRecord, ProofTranslationRecord
from app.portfolio.models.proof import Proof
from app.portfolio.models.proof_translation import ProofTranslation


async def get_proofs_by_portfolio_id(db: AsyncSession, portfolio_id: int) -> list[Proof]:
    """Returns the proofs of a portfolio by id, sorted by ``sort`` ASC.

    Eager-loads each proof's translations so the service can serialize the
    ``statements`` dict without extra round-trips.

    Args:
        db: Active async DB session.
        portfolio_id: The portfolio id.

    Returns:
        The portfolio's proofs ordered by ``sort`` ascending.
    """
    stmt = (
        select(Proof)
        .options(selectinload(Proof.translations))
        .where(Proof.portfolio_id == portfolio_id)
        .order_by(Proof.sort.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_proof(db: AsyncSession, proof_id: int) -> Proof | None:
    """Returns a single proof by id (with translations) or None.

    Args:
        db: Active async DB session.
        proof_id: The portfolio_proof id.

    Returns:
        The matching proof with translations loaded, or None.
    """
    result = await db.execute(select(Proof).options(selectinload(Proof.translations)).where(Proof.id == proof_id))
    return result.scalar_one_or_none()


async def create_proof(db: AsyncSession, proof: Proof) -> Proof:
    """Persists a new proof and refreshes it from the DB.

    Args:
        db: Active async DB session.
        proof: Proof (with ``portfolio_id``/``sort`` set).

    Returns:
        The created proof with generated ``id``.
    """
    db.add(proof)
    await db.flush()
    await db.refresh(proof)
    return proof


async def update_proof(db: AsyncSession, proof: Proof) -> Proof:
    """Flushes pending changes on an existing proof and refreshes it.

    Args:
        db: Active async DB session.
        proof: Proof with applied changes.

    Returns:
        The updated proof.
    """
    await db.flush()
    await db.refresh(proof)
    return proof


async def delete_proof(db: AsyncSession, proof: Proof) -> None:
    """Deletes a proof; translations are removed via relationship cascade.

    Args:
        db: Active async DB session.
        proof: Proof to delete.
    """
    await db.delete(proof)
    await db.flush()


async def get_max_proof_sort(db: AsyncSession, portfolio_id: int) -> int:
    """Returns the highest ``sort`` value for a portfolio's proofs (0 if none).

    Args:
        db: Active async DB session.
        portfolio_id: The portfolio id.

    Returns:
        The maximum ``sort`` among the portfolio's proofs, 0 if none.
    """
    result = await db.execute(select(func.coalesce(func.max(Proof.sort), 0)).where(Proof.portfolio_id == portfolio_id))
    return result.scalar_one()


async def reorder_proofs(db: AsyncSession, portfolio_id: int, ordered_ids: list[int]) -> list[Proof]:
    """Updates ``sort`` for multiple proofs based on the ordered id list.

    Args:
        db: Active async DB session.
        portfolio_id: The portfolio id to scope the update.
        ordered_ids: List of proof ids in desired order (index = sort).

    Returns:
        The re-sorted list of proofs (with translations).
    """
    for new_index, proof_id in enumerate(ordered_ids):
        result = await db.execute(
            select(Proof).where(
                Proof.id == proof_id,
                Proof.portfolio_id == portfolio_id,
            )
        )
        proof = result.scalar_one_or_none()
        if proof:
            proof.sort = new_index
    await db.flush()
    return await get_proofs_by_portfolio_id(db, portfolio_id)


async def replace_proof_statements(db: AsyncSession, proof: Proof, statements: dict[str, str]) -> None:
    """Replaces all statement rows of *proof* with *statements*.

    Uses the translation-table pattern: existing rows are deleted and the new
    rows created in one flush, avoiding partial merges.

    The localized ``question`` lives on the same translation row as the
    statement. To keep it when only the statement is updated, the current
    question per locale is captured before the delete and re-attached to the
    recreated rows.

    Args:
        db: Active async DB session.
        proof: Proof whose statements are replaced.
        statements: Mapping of locale → statement text to persist.
    """
    # Capture existing localized questions before the rows are replaced – a
    # statement-only update must not wipe the question of the same row.
    result = await db.execute(select(ProofTranslation).where(ProofTranslation.proof_id == proof.id))
    question_by_locale: dict[str, str | None] = {t.locale: t.question for t in result.scalars()}
    # Existing statement rows are removed unconditionally – a DELETE with no
    # matching rows is a no-op. This avoids a sync lazy-load on the
    # relationship (which would raise MissingGreenlet inside the async session
    # after refresh).
    _ = await db.execute(delete_stmt(ProofTranslation).where(ProofTranslation.proof_id == proof.id))
    # New rows are persisted via add_all with an explicit proof_id instead of
    # assigning ``proof.translations``. The collection assignment would trigger
    # a lazy-load on the (possibly unloaded) relationship. The previously
    # captured question is carried over so it survives the replacement.
    db.add_all(
        ProofTranslation(
            proof_id=proof.id,
            locale=locale,
            statement=statement,
            question=question_by_locale.get(locale),
        )
        for locale, statement in statements.items()
    )
    await db.flush()


async def upsert_proof_questions(
    db: AsyncSession,
    proof: Proof,
    questions: dict[str, str],
) -> None:
    """Sets the localized ``question`` for each ``(locale → frage)`` entry.

    Existing translation rows for the given locales are updated in place;
    missing rows are created with an empty ``statement`` (NOT NULL) so the
    question can be maintained independently of the statement. The logic runs
    on explicit ``proof_id`` to avoid a lazy-load on the relationship.

    Args:
        db: Active async DB session.
        proof: Proof whose translations get their question set.
        questions: Mapping of locale → question text to persist.
    """
    if not questions:
        return
    result = await db.execute(
        select(ProofTranslation).where(
            ProofTranslation.proof_id == proof.id,
            ProofTranslation.locale.in_(questions.keys()),
        )
    )
    existing = {t.locale: t for t in result.scalars()}
    for locale, question in questions.items():
        row = existing.get(locale)
        if row is not None:
            row.question = question
        else:
            db.add(
                ProofTranslation(
                    proof_id=proof.id,
                    locale=locale,
                    statement="",
                    question=question,
                )
            )
    await db.flush()


def _to_proof_record(proof: Proof) -> ProofRecord:
    """Maps a proof ORM row (with loaded translations) to its read record.

    Args:
        proof: Proof with eager-loaded ``translations``.

    Returns:
        The service-boundary record carrying structure fields and all localized
        statement/question rows.
    """
    return ProofRecord(
        id=proof.id,
        portfolio_id=proof.portfolio_id,
        image_src=proof.image_src,
        sort=proof.sort,
        priority=proof.priority,
        translations=tuple(
            ProofTranslationRecord(locale=t.locale, statement=t.statement, question=t.question)
            for t in proof.translations
        ),
    )


async def get_proof_record(db: AsyncSession, proof_id: int) -> ProofRecord | None:
    """Returns a single proof as a record by id, or ``None``.

    Args:
        db: Active async DB session.
        proof_id: The portfolio_proof id.

    Returns:
        The matching record (with translations) or ``None`` if not found.
    """
    proof = await get_proof(db, proof_id)
    return _to_proof_record(proof) if proof is not None else None


async def list_proof_records(db: AsyncSession, portfolio_id: int) -> list[ProofRecord]:
    """Returns a portfolio's proofs as records, sorted by ``sort`` ASC.

    Args:
        db: Active async DB session.
        portfolio_id: The portfolio id.

    Returns:
        The portfolio's proofs (with translations) as records.
    """
    proofs = await get_proofs_by_portfolio_id(db, portfolio_id)
    return [_to_proof_record(proof) for proof in proofs]


async def create_proof_record(
    db: AsyncSession,
    *,
    portfolio_id: int,
    image_src: str | None,
    sort: int,
    priority: str,
    statements: dict[str, str],
    questions: dict[str, str] | None,
) -> ProofRecord:
    """Creates a proof with its statements/questions and returns its record.

    Args:
        db: Active async DB session.
        portfolio_id: Id of the owning portfolio.
        image_src: Optional storage key of the proof image.
        sort: Ordering index.
        priority: Proof priority (``high`` or ``medium``).
        statements: Locale → statement text to persist.
        questions: Optional locale → question text to upsert.

    Returns:
        The created proof as a service-boundary record.
    """
    proof = Proof(portfolio_id=portfolio_id, image_src=image_src, sort=sort, priority=priority)
    db.add(proof)
    await db.flush()
    await db.refresh(proof)
    await replace_proof_statements(db, proof, statements)
    if questions:
        await upsert_proof_questions(db, proof, questions)
    await db.flush()
    await db.refresh(proof, ["translations"])
    return _to_proof_record(proof)


async def update_proof_record(
    db: AsyncSession,
    proof_id: int,
    *,
    updates: dict[str, object],
    statements: dict[str, str] | None,
    questions: dict[str, str] | None,
) -> ProofRecord | None:
    """Applies partial proof updates plus optional statements/questions.

    Args:
        db: Active async DB session.
        proof_id: The portfolio_proof id.
        updates: Structure-field values to set on the proof.
        statements: Locale → statement text to replace, or ``None`` to keep.
        questions: Locale → question text to upsert, or ``None`` to keep.

    Returns:
        The updated proof as a record, or ``None`` if it does not exist.
    """
    proof = await db.get(Proof, proof_id)
    if proof is None:
        return None
    for key, value in updates.items():
        setattr(proof, key, value)
    if statements is not None:
        await replace_proof_statements(db, proof, statements)
    if questions is not None:
        await upsert_proof_questions(db, proof, questions)
    await db.flush()
    await db.refresh(proof, ["translations"])
    return _to_proof_record(proof)


async def delete_proof_record(db: AsyncSession, proof_id: int) -> None:
    """Deletes a proof by id; its translations cascade via the relationship.

    Args:
        db: Active async DB session.
        proof_id: The portfolio_proof id.
    """
    proof = await get_proof(db, proof_id)
    if proof is not None:
        await delete_proof(db, proof)


async def reorder_proof_records(
    db: AsyncSession,
    portfolio_id: int,
    ordered_ids: list[int],
) -> list[ProofRecord]:
    """Writes ``sort`` positions from *ordered_ids* and returns the records.

    Args:
        db: Active async DB session.
        portfolio_id: The portfolio id to scope the update.
        ordered_ids: Proof ids in desired order (index = ``sort``).

    Returns:
        The re-sorted proofs (with translations) as records.
    """
    proofs = await reorder_proofs(db, portfolio_id, ordered_ids)
    return [_to_proof_record(proof) for proof in proofs]


async def set_image_src(db: AsyncSession, proof_id: int, image_src: str) -> None:
    """Sets the ``image_src`` storage key of a proof and commits.

    Args:
        db: Active async DB session.
        proof_id: The portfolio_proof id.
        image_src: Storage key to persist on the proof.
    """
    proof = await db.get(Proof, proof_id)
    if proof is not None:
        proof.image_src = image_src
        await db.commit()
