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
    """Non-critical: keep the probe cheap (2s) so a Mongo blip does not stall
    the whole `/api/health/` response and keep the singleton reusable."""
    try:
        import certifi
        from django.conf import settings
        from pymongo import MongoClient
        from pymongo.errors import PyMongoError

        uri = getattr(settings, 'MONGODB', {}).get('URI', '')
        if not uri:
            return False, 'MONGO_URI not configured'
        kwargs = {'serverSelectionTimeoutMS': 2000}
        uri_lower = uri.lower()
        if uri_lower.startswith('mongodb+srv://') or 'tls=true' in uri_lower or 'ssl=true' in uri_lower:
            kwargs['tlsCAFile'] = certifi.where()
        client = MongoClient(uri, **kwargs)
        client.admin.command('ping')
        client.close()
        return True, None
    except PyMongoError as exc:
        return False, str(exc)[:200]
    except Exception as exc:
        return False, f'{type(exc).__name__}: {str(exc)[:200]}'


CRITICAL_CHECKS = ('postgres', 'redis')


def health(request):
    """Health check for UptimeRobot and Render probes.

    Critical dependencies (postgres, redis) determine the HTTP status:
      - Both OK → 200 `ok`
      - Any critical down → 503 `unhealthy`

    Non-critical dependencies (mongo) never fail the response — they only
    downgrade `status` to `degraded` in the body. Mongo hosts audit trail
    and QR history — losing it temporarily degrades observability but does
    not break the user-facing app. This is intentional so UptimeRobot does
    not page for a Mongo TLS blip while Postgres/Redis are healthy.
    """
    checks = {
        'postgres': _check_postgres(),
        'redis': _check_redis(),
        'mongo': _check_mongo(),
    }
    critical_ok = all(checks[name][0] for name in CRITICAL_CHECKS)
    any_degraded = any(not ok for ok, _ in checks.values())

    if not critical_ok:
        status = 'unhealthy'
        http_status = 503
    elif any_degraded:
        status = 'degraded'
        http_status = 200
    else:
        status = 'ok'
        http_status = 200

    checks_output = {}
    for name, (ok, err) in checks.items():
        entry = {
            'ok': ok,
            'critical': name in CRITICAL_CHECKS,
        }
        if settings.DEBUG:
            entry['error'] = err
        checks_output[name] = entry

    body = {
        'status': status,
        'service': 'winnie-the-gym-api',
        'version': '1.0.0',
        'checks': checks_output,
    }
    return JsonResponse(body, status=http_status)


def password_reset_confirm_redirect(request, uidb64, token):
    """Frontend-side confirmation page — dj-rest-auth reverses this name to build
    the email link. The actual reset flow is handled by the SPA at
    /reset-password/{uidb64}/{token}."""
    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    return HttpResponseRedirect(f'{frontend}/reset-password/{uidb64}/{token}')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
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
    urlpatterns += [
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
