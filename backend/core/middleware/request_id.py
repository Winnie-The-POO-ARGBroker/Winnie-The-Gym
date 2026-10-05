import logging
import uuid
from contextvars import ContextVar
from typing import Optional

request_id_var: ContextVar[str] = ContextVar('request_id', default='')


def get_request_id() -> str:
    """Retorna el identificador de request activo en el contexto actual, o cadena vacía."""
    return request_id_var.get() or ''


class RequestIDMiddleware:
    """Middleware que genera o propaga un UUID por request.

    Almacena el ID en `contextvars` para que cualquier logger pueda
    inyectarlo automáticamente en logs estructurados (JSON), y lo
    retorna en el header de respuesta `X-Request-ID`.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        rid = (
            request.headers.get('X-Request-ID')
            or request.META.get('HTTP_X_REQUEST_ID')
            or str(uuid.uuid4())
        )
        request.request_id = rid
        token = request_id_var.set(rid)
        try:
            response = self.get_response(request)
            response['X-Request-ID'] = rid
            return response
        finally:
            request_id_var.reset(token)


class RequestIDFilter(logging.Filter):
    """Filtro de logging que inyecta el request_id activo en cada LogRecord."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get() or '-'
        return True
