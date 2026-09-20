from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0008_clase_hora_step3_finalize'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='inscripcionclase',
            options={'ordering': ['-created_at'], 'verbose_name': 'Inscripción a Clase', 'verbose_name_plural': 'Inscripciones a Clases'},
        ),
        migrations.AddField(
            model_name='inscripcionclase',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
