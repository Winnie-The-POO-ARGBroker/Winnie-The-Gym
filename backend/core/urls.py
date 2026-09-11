from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)


def health(request):
    return JsonResponse({
        "status": "ok",
        "service": "winnie-the-gym-api",
        "version": "0.1.0",
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/auth/', include(('apps.users.urls', 'users'), namespace='users')),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/auth/social/', include('allauth.socialaccount.urls')),
    path('api/access/', include(('apps.access.urls', 'access'), namespace='access')),
    path('api/members/', include(('apps.members.urls', 'members'), namespace='members')),
    path('api/memberships/', include(('apps.memberships.urls', 'memberships'), namespace='memberships')),
    path('api/classes/', include(('apps.classes.urls', 'classes'), namespace='classes')),
    path('api/payments/', include(('apps.payments.urls', 'payments'), namespace='payments')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
