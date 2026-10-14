from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Records who changed what and when for auditable models.

    `changes_json` stores a dict of {field: [old_value, new_value]} pairs.
    """

    class Action(models.TextChoices):
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DELETE = 'delete', 'Delete'

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='Actor',
    )
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    action = models.CharField(max_length=10, choices=Action.choices)
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.PositiveBigIntegerField(db_index=True)
    changes_json = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id'], name='audit_entity_idx'),
            models.Index(fields=['actor', 'timestamp'], name='audit_actor_ts_idx'),
        ]

    def __str__(self):
        actor_str = self.actor.email if self.actor_id else 'system'
        return f'[{self.timestamp}] {actor_str} {self.action} {self.entity_type}#{self.entity_id}'
