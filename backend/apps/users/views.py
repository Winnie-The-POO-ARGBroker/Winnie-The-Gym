from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.members.models import Socio
from .serializers import ProfileCompleteSerializer, ProfileSerializer


class GoogleLoginView(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client


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
