import logging

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from dj_rest_auth.views import PasswordResetView as BasePasswordResetView
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response

from apps.members.models import Socio
from .serializers import ProfileCompleteSerializer, ProfileSerializer
from .services import get_or_create_user_by_role


logger = logging.getLogger(__name__)


class GoogleLoginView(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client

    @property
    def callback_url(self):
        # Must match the `redirect_uri` the frontend sends to Google in the
        # authorize step. If they diverge, Google rejects the code exchange
        # with `redirect_uri_mismatch` and dj-rest-auth returns 400.
        return f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback"


class SafePasswordResetView(BasePasswordResetView):
    """dj-rest-auth's PasswordResetView with tolerant email delivery.

    The upstream view lets email backend exceptions bubble up as 500. That
    creates two problems:
      1. It leaks whether the recipient exists (opposite of what a reset flow
         should do).
      2. In dev with Mailtrap's `demomailtrap.co` sender we can only send to
         the account owner, so any test address would 500.
    We catch email failures, log them, and always respond 200 so behaviour is
    consistent for callers regardless of delivery outcome.
    """

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except Exception as exc:
            logger.warning('Password reset email failed: %s', exc)
            return Response(
                {'detail': 'Password reset e-mail has been sent.'},
                status=status.HTTP_200_OK,
            )


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileSerializer
    http_method_names = ['get', 'patch']

    def get_object(self):
        return get_object_or_404(Socio, usuario=self.request.user)


class CompleteProfileView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileCompleteSerializer

    def create(self, request, *args, **kwargs):
        if request.user.is_profile_complete:
            return Response(
                {'detail': 'Profile already complete.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)


DEV_LOGIN_ALLOWLIST = {
    'administrador': 'admin@winniegym.com',
    'recepcionista': 'recepcionista@winniegym.com',
    'socio': 'socio@winniegym.com',
}


class DevLoginView(views.APIView):
    """SOLO USAR EN DEV, GATED POR DEBUG=True. NUNCA HABILITAR EN PRODUCCIÓN.

    Dev-only authentication helper to issue genuine SimpleJWT tokens in local development.
    Accepts ONLY allowed roles ('administrador', 'recepcionista', 'socio') mapped to a fixed
    allowlist of dev fixture accounts. Does NOT accept arbitrary email inputs.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        if not settings.DEBUG:
            return Response(
                {'detail': 'Dev login endpoint is disabled in production.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from rest_framework_simplejwt.tokens import RefreshToken

        rol = request.data.get('rol')
        if rol not in DEV_LOGIN_ALLOWLIST:
            return Response(
                {
                    'detail': f"Rol inválido para dev-login. Roles permitidos: {list(DEV_LOGIN_ALLOWLIST.keys())}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = DEV_LOGIN_ALLOWLIST[rol]
        user, created = get_or_create_user_by_role(email, rol)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        nombre = 'Admin'
        apellido = 'Gym'
        if hasattr(user, 'socio'):
            nombre = user.socio.nombre
            apellido = user.socio.apellido
        elif rol == 'recepcionista':
            nombre = 'Recepcionista'
            apellido = 'Gym'

        return Response({
            'access': access_token,
            'refresh': refresh_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'rol': user.rol,
                'nombre': nombre,
                'apellido': apellido,
                'is_profile_complete': user.is_profile_complete,
            },
        }, status=status.HTTP_200_OK)
