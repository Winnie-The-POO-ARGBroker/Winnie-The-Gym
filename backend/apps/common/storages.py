"""Supabase Storage adapters for user-uploaded media.

Supabase Storage exposes an S3-compatible endpoint, so we lean on
`django-storages[s3]` (via boto3) and only override the bits that Supabase
does differently (URL building, no ACL support on the free tier).

In dev, `settings/development.py` keeps the default `FileSystemStorage`
pointing at `MEDIA_ROOT`, so nothing changes locally. In prod
`settings/production.py` swaps this class in via `STORAGES["default"]`.

#227 — Medical certificates now use a PRIVATE bucket (`certificados-privados`).
URLs are always generated as signed S3 pre-signed URLs (never public). The
public `SupabaseMediaStorage` is kept for potential future non-sensitive uploads.
"""
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class SupabaseMediaStorage(S3Boto3Storage):
    """S3Boto3-backed storage pointing at a Supabase Storage bucket.

    Supabase notes:
    - The bucket must exist BEFORE the app starts (create it manually or via
      Terraform). `bucket_name` from settings.
    - Supabase does NOT support `ACL='public-read'` — use bucket-level policy.
    - Public URLs follow `{SUPABASE_STORAGE_PUBLIC_URL_BASE}/{bucket}/{path}`
      instead of the S3-style path.
    """

    file_overwrite = False  # keep the same-named upload from clobbering priors
    default_acl = None  # Supabase rejects ACL headers on the free plan
    querystring_auth = False  # Public bucket, no signed URLs by default

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('bucket_name', settings.SUPABASE_STORAGE_BUCKET)
        kwargs.setdefault('access_key', settings.SUPABASE_STORAGE_ACCESS_KEY)
        kwargs.setdefault('secret_key', settings.SUPABASE_STORAGE_SECRET_KEY)
        kwargs.setdefault('region_name', settings.SUPABASE_STORAGE_REGION)
        kwargs.setdefault('endpoint_url', settings.SUPABASE_STORAGE_ENDPOINT)
        super().__init__(*args, **kwargs)

    def url(self, name, parameters=None, expire=None, http_method=None):
        base = (settings.SUPABASE_STORAGE_PUBLIC_URL_BASE or '').rstrip('/')
        if not base:
            return super().url(name, parameters=parameters, expire=expire, http_method=http_method)
        return f'{base}/{self.bucket_name}/{name.lstrip("/")}'


class SupabasePrivateCertStorage(S3Boto3Storage):
    """Private bucket storage for medical certificates (#227).

    Files land in `certificados-privados` bucket. The bucket policy must be
    set to PRIVATE — no public read. URLs are always S3 pre-signed and
    generated on demand via `generar_signed_url_certificado`, NOT via this
    storage's `.url()` method (which would generate them with the default TTL).

    This class is used by `guardar_certificado_medico` to store the file; the
    public path key is saved to `Socio.certificado_medico_path`.
    """

    file_overwrite = True   # we always use UUID names so no collision risk
    default_acl = None      # Supabase rejects ACL headers
    querystring_auth = True  # Always signed — private bucket

    def __init__(self, *args, **kwargs):
        kwargs.setdefault(
            'bucket_name',
            getattr(settings, 'SUPABASE_PRIVATE_CERT_BUCKET', 'certificados-privados'),
        )
        kwargs.setdefault('access_key', settings.SUPABASE_STORAGE_ACCESS_KEY)
        kwargs.setdefault('secret_key', settings.SUPABASE_STORAGE_SECRET_KEY)
        kwargs.setdefault('region_name', settings.SUPABASE_STORAGE_REGION)
        kwargs.setdefault('endpoint_url', settings.SUPABASE_STORAGE_ENDPOINT)
        super().__init__(*args, **kwargs)
