from .base import *

DEBUG = True

# Widened for the ngrok tunnel MP uses to reach our webhook in dev.
# `.ngrok-free.dev` / `.ngrok-free.app` cover any reserved or on-demand tunnel.
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'backend',
    '.ngrok-free.dev',
    '.ngrok-free.app',
    '.ngrok.io',
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://frontend:5173',
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https:\/\/.*\.ngrok-free\.dev$',
    r'^https:\/\/.*\.ngrok-free\.app$',
    r'^https:\/\/.*\.ngrok\.io$',
]

# MercadoPago posts the webhook as a cross-site request; the ngrok host has to
# be trusted or Django rejects the POST as CSRF-invalid before the view runs.
CSRF_TRUSTED_ORIGINS = [
    'https://*.ngrok-free.dev',
    'https://*.ngrok-free.app',
    'https://*.ngrok.io',
]
