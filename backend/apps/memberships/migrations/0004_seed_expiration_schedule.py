from django.db import migrations


def create_schedule(apps, schema_editor):
    CrontabSchedule = apps.get_model('django_celery_beat', 'CrontabSchedule')
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')

    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute='0',
        hour='9',
        day_of_week='*',
        day_of_month='*',
        month_of_year='*',
        timezone='America/Argentina/Buenos_Aires',
    )
    PeriodicTask.objects.update_or_create(
        name='memberships.daily_expiration_check',
        defaults={
            'task': 'memberships.check_expiring_memberships',
            'crontab': schedule,
            'enabled': True,
            'description': 'Sends 7/3/1/0-day expiration emails and marks vencidas.',
        },
    )


def remove_schedule(apps, schema_editor):
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
    PeriodicTask.objects.filter(name='memberships.daily_expiration_check').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('memberships', '0003_membresia_avisos_enviados'),
        ('django_celery_beat', '0019_alter_periodictasks_options'),
    ]

    operations = [
        migrations.RunPython(create_schedule, remove_schedule),
    ]
