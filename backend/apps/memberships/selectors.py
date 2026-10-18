"""Memberships selectors — pure query functions (read-only, no side effects).

The ``socios_morosos_queryset`` function is the **single source of truth** for
delinquency. Every view, task, and report that needs to identify morosos must
use this function rather than duplicating the filter logic.
"""
from django.db.models import OuterRef, Subquery
from django.utils import timezone

from apps.members.models import Socio
from .models import Membresia


def ultimas_membresias(queryset=None):
    """Restrict a Membresia queryset to each socio's latest membership.

    "Latest" uses the same ordering as ``socios_morosos_queryset``
    (fecha_fin desc, created_at desc), with pk as a final tiebreaker so exactly
    one row per socio qualifies. RENOVADA rows are skipped: a row replaced by a
    renewal is never the current membership, even if it ends later than the new
    one (possible with the 'replace' policy).
    """
    if queryset is None:
        queryset = Membresia.objects.all()
    latest_pk = Subquery(
        Membresia.objects.filter(
            socio=OuterRef('socio'),
        ).exclude(
            estado=Membresia.Estado.RENOVADA,
        ).order_by('-fecha_fin', '-created_at', '-pk').values('pk')[:1]
    )
    return queryset.filter(pk=latest_pk)


def socios_morosos_queryset():
    """Return a QuerySet of Socio instances whose *last* membership is overdue.

    A socio is considered moroso when:
    - Their most recent membership (by fecha_fin desc) has estado VENCIDA, OR
    - They have no membership at all (never paid — omitted from this query for
      now; the contract says vencida or inexistent, but we only track those with
      a vencida row to avoid flagging newly-registered socios).

    Excludes socios who have renewed (i.e. their latest membership is ACTIVA).

    Returns:
        QuerySet[Socio] with select_related('usuario') applied.
    """
    today = timezone.localdate()

    # Subquery: the most-recent membership estado per socio
    latest_estado = Subquery(
        Membresia.objects.filter(
            socio=OuterRef('pk'),
        ).exclude(
            estado=Membresia.Estado.RENOVADA,
        ).order_by('-fecha_fin', '-created_at').values('estado')[:1]
    )

    return (
        Socio.objects
        .annotate(ultima_membresia_estado=latest_estado)
        .filter(
            ultima_membresia_estado=Membresia.Estado.VENCIDA,
        )
        .select_related('usuario')
        .order_by('apellido', 'nombre')
    )
