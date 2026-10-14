from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            'id',
            'actor',
            'actor_email',
            'timestamp',
            'action',
            'entity_type',
            'entity_id',
            'changes_json',
        )
        read_only_fields = fields

    def get_actor_email(self, obj):
        return obj.actor.email if obj.actor_id else None
