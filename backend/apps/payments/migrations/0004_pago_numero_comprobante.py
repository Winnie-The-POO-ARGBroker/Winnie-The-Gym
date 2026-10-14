"""#192 — Add numero_comprobante to Pago for sequential annual receipt numbering."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_pago_audit_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='pago',
            name='numero_comprobante',
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=20,
                null=True,
                unique=True,
                verbose_name='Número de comprobante',
            ),
        ),
    ]
