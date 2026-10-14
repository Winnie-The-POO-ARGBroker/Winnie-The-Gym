"""Tests for #219 — Audit log (AuditLog model + signals + endpoint)."""
from datetime import date

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from conftest import make_user_factory, make_socio_factory


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


AUDIT_URL = '/api/audit/logs/'


class AuditLogSignalTests(APITestCase):
    """Test that AuditLog entries are created when audited models change."""

    def test_audit_log_created_on_socio_update_captures_actor_and_diff(self):
        """AuditLog is written with actor and diff when a Socio is updated (#219)."""
        from apps.audit.models import AuditLog
        from apps.common.middleware import _thread_locals

        admin = make_user_factory(rol='administrador')
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user)

        # Simulate a request context so the signal can pick up the actor.
        _thread_locals.user = admin
        try:
            original_nombre = socio.nombre
            socio.nombre = 'NombreCambiado'
            socio.save()
        finally:
            _thread_locals.user = None

        log = AuditLog.objects.filter(
            entity_type='members.Socio',
            entity_id=socio.pk,
            action=AuditLog.Action.UPDATE,
        ).first()

        self.assertIsNotNone(log, 'Expected an AuditLog entry after Socio.save()')
        self.assertEqual(log.actor_id, admin.pk)
        self.assertIn('nombre', log.changes_json)
        old_val, new_val = log.changes_json['nombre']
        self.assertEqual(old_val, original_nombre)
        self.assertEqual(new_val, 'NombreCambiado')


class AuditLogEndpointTests(APITestCase):
    """Test the GET /api/audit/logs/ endpoint permission matrix."""

    def test_audit_logs_endpoint_admin_only_returns_403_for_recep(self):
        """Recepcionista must receive 403 on GET /api/audit/logs/ (#219)."""
        recep = make_user_factory(rol='recepcionista')
        _auth_client(self.client, recep)

        response = self.client.get(AUDIT_URL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_logs_endpoint_admin_200(self):
        """Admin can list audit logs."""
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        response = self.client.get(AUDIT_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_audit_logs_unauthenticated_401(self):
        """Unauthenticated requests must be rejected."""
        response = self.client.get(AUDIT_URL)
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
