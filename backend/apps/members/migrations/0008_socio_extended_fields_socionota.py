import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0007_socio_textchoices_ordering'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # #232 — extended socio fields
        migrations.AddField(
            model_name='socio',
            name='fecha_nacimiento',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='socio',
            name='genero',
            field=models.CharField(
                blank=True,
                choices=[
                    ('F', 'Femenino'),
                    ('M', 'Masculino'),
                    ('X', 'No binario'),
                    ('N', 'Prefiero no decir'),
                ],
                max_length=1,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='socio',
            name='contacto_emergencia_nombre',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='socio',
            name='contacto_emergencia_telefono',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
        # #234 — SocioNota model
        migrations.CreateModel(
            name='SocioNota',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('texto', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('autor', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='notas_socios',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('socio', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notas',
                    to='members.socio',
                )),
            ],
            options={
                'verbose_name': 'Nota de Socio',
                'verbose_name_plural': 'Notas de Socios',
                'ordering': ['-created_at'],
            },
        ),
    ]
