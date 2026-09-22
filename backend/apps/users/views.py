import logging

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from dj_rest_auth.views import PasswordResetView as BasePasswordResetView
from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.members.models import Socio
from .permissions import IsAdminOnly
from .serializers import (
    ProfileCompleteSerializer,
    ProfileSerializer,
    StaffCreateSerializer,
    StaffListSerializer,
)
from .services import send_activation_email

User = get_user_model()


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
        if request.user.rol != 'socio':
            return Response(
                {'detail': 'Solo los socios pueden completar el perfil de socio.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.user.is_profile_complete:
            return Response(
                {'detail': 'Profile already complete.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)


class StaffView(generics.ListCreateAPIView):
    """GET + POST /api/users/staff/

    GET  — list all administrador and recepcionista users (admin-only).
    POST — create a new staff user (admin-only). Sets unusable password and
           dispatches an activation email.
    """
    permission_classes = [IsAdminOnly]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StaffCreateSerializer
        return StaffListSerializer

    def get_queryset(self):
        return User.objects.filter(
            rol__in=['administrador', 'recepcionista']
        ).order_by('email')

    def perform_create(self, serializer):
        user = serializer.save()
        send_activation_email(user)


class StaffResendActivationView(views.APIView):
    """POST /api/users/staff/{id}/resend-activation/ — resend activation email.

    Admin-only. Useful when the original email was lost or expired.
    """
    permission_classes = [IsAdminOnly]

    def post(self, request, pk=None):
        user = get_object_or_404(User, pk=pk, rol__in=['administrador', 'recepcionista'])
        send_activation_email(user)
        return Response({'detail': 'Activation email re-sent.'}, status=status.HTTP_200_OK)


