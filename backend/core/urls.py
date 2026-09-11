import logging

from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponseRedirect, JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

from apps.users.views import SafePasswordResetView


logger = logging.getLogger(__name__)


def _check_postgres():
    try:
        from django.db import connection
        with connection.cursor() as cur:
            cur.execute('SELECT 1')
        return True, None
    except Exception as exc:
        return False, str(exc)


def _check_redis():
    try:
        from django.core.cache import cache
        cache.set('_healthcheck', 'ok', timeout=5)
        return cache.get('_healthcheck') == 'ok', None
    except Exception as exc:
        return False, str(exc)


def _check_mongo():
    try:
        from core.mongodb import get_mongo_db
        db = get_mongo_db()
        db.command('ping')
        return True, None
    except Exception as exc:
        return False, str(exc)


def health(request):
    """Full health check for UptimeRobot and Render probes.

    Returns 200 when every dependency is reachable, 503 otherwise. Individual
    check errors are included in the body without leaking secrets.
    """
    checks = {
        'postgres': _check_postgres(),
        'redis': _check_redis(),
        'mongo': _check_mongo(),
    }
    all_ok = all(ok for ok, _ in checks.values())
    body = {
        'status': 'ok' if all_ok else 'degraded',
        'service': 'winnie-the-gym-api',
        'version': '0.1.0',
        'checks': {
            name: {'ok': ok, 'error': err}
            for name, (ok, err) in checks.items()
        },
    }
    return JsonResponse(body, status=200 if all_ok else 503)


def password_reset_confirm_redirect(request, uidb64, token):
    """Frontend-side confirmation page — dj-rest-auth reverses this name to build
    the email link. The actual reset flow is handled by the SPA at
    /reset-password/{uidb64}/{token}."""
    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    return HttpResponseRedirect(f'{frontend}/reset-password/{uidb64}/{token}')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/auth/', include(('apps.users.urls', 'users'), namespace='users')),
    # Override dj-rest-auth's PasswordResetView with our tolerant variant BEFORE
    # including the rest of the auth routes so this pattern wins the match.
    path('api/auth/password/reset/', SafePasswordResetView.as_view(), name='rest_password_reset'),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/auth/social/', include('allauth.socialaccount.urls')),
    # dj-rest-auth reverses `password_reset_confirm` to build the email URL.
    # We proxy it to the SPA route where the actual reset form lives.
    path(
        'api/auth/password/reset/confirm/<uidb64>/<token>/',
        password_reset_confirm_redirect,
        name='password_reset_confirm',
    ),
    path('api/access/', include(('apps.access.urls', 'access'), namespace='access')),
    path('api/members/', include(('apps.members.urls', 'members'), namespace='members')),
    path('api/memberships/', include(('apps.memberships.urls', 'memberships'), namespace='memberships')),
    path('api/classes/', include(('apps.classes.urls', 'classes'), namespace='classes')),
    path('api/payments/', include(('apps.payments.urls', 'payments'), namespace='payments')),
    path('api/reportes/', include(('apps.reports.urls', 'reports'), namespace='reports')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
