from rest_framework import serializers
from .models import AccessLog


class GenerateQRResponseSerializer(serializers.Serializer):
    qr_token = serializers.CharField()
    expires_in = serializers.IntegerField()
    expires_at = serializers.IntegerField()
    jti = serializers.CharField()


class ScanQRSerializer(serializers.Serializer):
    qr_token = serializers.CharField(required=True)
    access_type = serializers.ChoiceField(
        choices=AccessLog.ACCESS_TYPE_CHOICES,
        default='ENTRY'
    )


class AccessLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    scanned_by_email = serializers.EmailField(source='scanned_by.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AccessLog
        fields = [
            'id',
            'timestamp',
            'user',
            'user_email',
            'user_name',
            'access_type',
            'status',
            'status_display',
            'denial_reason',
            'qr_jti',
            'scanned_by',
            'scanned_by_email',
        ]
