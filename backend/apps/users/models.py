from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('rol', 'administrador')
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Rol(models.TextChoices):
        ADMINISTRADOR = 'administrador', 'Administrador'
        RECEPCIONISTA = 'recepcionista', 'Recepcionista'
        SOCIO = 'socio', 'Socio'

    email = models.EmailField(unique=True)
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.SOCIO)
    foto = models.URLField(blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    @property
    def is_profile_complete(self):
        return hasattr(self, 'socio')

    def __str__(self):
        return self.email

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
