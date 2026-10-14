"""Migration for #227 and #228.

#227 — Add certificado_medico_path (UUID-named private bucket key).
#228 — Add certificado_emitido_en, certificado_vence_en,
        and aviso_apto_enviado idempotency field.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0008_socio_extended_fields_socionota'),
    ]

    operations = [
        # #227 — private bucket path (UUID key, no PII)
        migrations.AddField(
            model_name='socio',
            name='certificado_medico_path',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        # #228 — certificate validity dates
        migrations.AddField(
            model_name='socio',
            name='certificado_emitido_en',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='socio',
            name='certificado_vence_en',
            field=models.DateField(blank=True, null=True),
        ),
        # #228 — idempotency tracking for reminder emails (JSON dict as text)
        migrations.AddField(
            model_name='socio',
            name='aviso_apto_enviado',
            field=models.TextField(blank=True, db_column='aviso_apto_enviado', default='{}'),
        ),
    ]
