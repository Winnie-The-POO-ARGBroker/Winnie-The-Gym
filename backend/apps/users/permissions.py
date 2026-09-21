"""Permission classes for the users app.

Re-exports the shared permission classes so that views in this app do not need
cross-app imports. This also serves as the single source of truth for user-
management endpoint policies.
"""
# IsAdminOnly and IsReceptionistOrAdmin are already defined in apps.access.permissions
# and used by other apps. We import them here so users app views stay clean.
from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin  # noqa: F401
