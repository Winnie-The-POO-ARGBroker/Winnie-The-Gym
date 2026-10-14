from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_add_email_enviado_to_pago'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='pago',
            name='cobrado_por',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='pagos_cobrados',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='pago',
            name='medio_manual',
            field=models.CharField(
                blank=True,
                choices=[
                    ('efectivo', 'Efectivo'),
                    ('transferencia', 'Transferencia'),
                    ('debito', 'Débito'),
                    ('credito', 'Crédito'),
                    ('otro', 'Otro'),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='pago',
            name='observacion',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='pago',
            name='anulado',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='pago',
            name='anulado_por',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='pagos_anulados',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='pago',
            name='anulado_en',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='pago',
            name='motivo_anulacion',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='pago',
            name='idempotency_key',
            field=models.CharField(blank=True, max_length=128, null=True, unique=True),
        ),
    ]
