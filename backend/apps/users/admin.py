from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'rol', 'is_active', 'date_joined')
    list_filter = ('rol', 'is_active', 'is_staff')
    search_fields = ('email',)
    ordering = ('-date_joined',)
    fieldsets = UserAdmin.fieldsets + (
        ('Gym', {'fields': ('rol', 'google_id', 'foto')}),
    )
