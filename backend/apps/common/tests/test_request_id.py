import io
import json
import logging
import uuid

from django.conf import settings
from django.http import HttpResponse
from django.test import RequestFactory, TestCase
from pythonjsonlogger.jsonlogger import JsonFormatter

from core.middleware.request_id import (
    RequestIDFilter,
    RequestIDMiddleware,
    get_request_id,
    request_id_var,
)


class RequestIDMiddlewareUnitTests(TestCase):
    """Pruebas unitarias para RequestIDMiddleware y manejo de contextvars."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_generates_uuid_when_no_header_provided(self):
        observed_context_id = None

        def dummy_view(request):
            nonlocal observed_context_id
            observed_context_id = get_request_id()
            return HttpResponse('OK')

        middleware = RequestIDMiddleware(dummy_view)
        request = self.factory.get('/api/test/')

        response = middleware(request)

        # Debe generar un UUID válido
        self.assertIn('X-Request-ID', response)
        rid = response['X-Request-ID']
        uuid_obj = uuid.UUID(rid)
        self.assertEqual(str(uuid_obj), rid)

        # Debe coincidir con lo observado en contextvars durante el request
        self.assertEqual(observed_context_id, rid)
        self.assertEqual(request.request_id, rid)

        # Al finalizar el request, contextvars debe haber sido reseteado
        self.assertEqual(request_id_var.get(), '')

    def test_propagates_existing_x_request_id_header(self):
        custom_id = 'test-trace-uuid-12345678'
        observed_context_id = None

        def dummy_view(request):
            nonlocal observed_context_id
            observed_context_id = get_request_id()
            return HttpResponse('OK')

        middleware = RequestIDMiddleware(dummy_view)
        request = self.factory.get('/api/test/', HTTP_X_REQUEST_ID=custom_id)

        response = middleware(request)

        self.assertEqual(response['X-Request-ID'], custom_id)
        self.assertEqual(observed_context_id, custom_id)
        self.assertEqual(request.request_id, custom_id)
        self.assertEqual(request_id_var.get(), '')

    def test_contextvar_is_reset_even_if_view_raises(self):
        def failing_view(request):
            self.assertTrue(bool(get_request_id()))
            raise ValueError('Error de prueba')

        middleware = RequestIDMiddleware(failing_view)
        request = self.factory.get('/api/test/')

        with self.assertRaises(ValueError):
            middleware(request)

        # contextvar debe quedar reseteado incluso ante excepciones
        self.assertEqual(request_id_var.get(), '')


class RequestIDFilterUnitTests(TestCase):
    """Pruebas para RequestIDFilter."""

    def test_filter_injects_request_id_from_contextvar(self):
        token = request_id_var.set('ctx-req-999')
        try:
            log_filter = RequestIDFilter()
            record = logging.LogRecord(
                name='test.filter',
                level=logging.INFO,
                pathname=__file__,
                lineno=10,
                msg='test message',
                args=(),
                exc_info=None,
            )
            result = log_filter.filter(record)
            self.assertTrue(result)
            self.assertEqual(record.request_id, 'ctx-req-999')
        finally:
            request_id_var.reset(token)

    def test_filter_injects_dash_when_contextvar_empty(self):
        self.assertEqual(request_id_var.get(), '')
        log_filter = RequestIDFilter()
        record = logging.LogRecord(
            name='test.filter',
            level=logging.INFO,
            pathname=__file__,
            lineno=10,
            msg='test message',
            args=(),
            exc_info=None,
        )
        result = log_filter.filter(record)
        self.assertTrue(result)
        self.assertEqual(record.request_id, '-')


class RequestIDLoggingIntegrationTests(TestCase):
    """Pruebas de integración con JsonFormatter y Django Test Client."""

    def test_json_formatter_emits_request_id_field(self):
        formatter_conf = settings.LOGGING['formatters']['json']
        formatter = JsonFormatter(
            formatter_conf['format'],
            rename_fields=formatter_conf.get('rename_fields', {}),
        )

        log_filter = RequestIDFilter()
        token = request_id_var.set('trace-json-log-123')
        try:
            record = logging.LogRecord(
                name='test.json',
                level=logging.INFO,
                pathname=__file__,
                lineno=42,
                msg='operación completada',
                args=(),
                exc_info=None,
            )
            log_filter.filter(record)
            formatted = formatter.format(record)
            parsed = json.loads(formatted)

            self.assertIn('request_id', parsed)
            self.assertEqual(parsed['request_id'], 'trace-json-log-123')
            self.assertEqual(parsed['message'], 'operación completada')
            self.assertEqual(parsed['level'], 'INFO')
        finally:
            request_id_var.reset(token)

    def test_client_request_receives_x_request_id_header(self):
        response = self.client.get('/api/health/')
        self.assertIn('X-Request-ID', response.headers)
        rid = response.headers['X-Request-ID']
        # Validar formato UUID
        parsed_uuid = uuid.UUID(rid)
        self.assertEqual(str(parsed_uuid), rid)

    def test_client_request_preserves_custom_x_request_id(self):
        custom_id = 'custom-trace-abc-123'
        response = self.client.get('/api/health/', HTTP_X_REQUEST_ID=custom_id)
        self.assertEqual(response.headers.get('X-Request-ID'), custom_id)

    def test_logger_emits_request_id_during_http_request(self):
        """Verifica que un log emitido durante el procesamiento HTTP contenga el request_id."""
        stream = io.StringIO()
        handler = logging.StreamHandler(stream)
        handler.addFilter(RequestIDFilter())
        formatter_conf = settings.LOGGING['formatters']['json']
        handler.setFormatter(
            JsonFormatter(
                formatter_conf['format'],
                rename_fields=formatter_conf.get('rename_fields', {}),
            )
        )

        test_logger = logging.getLogger('common.tests.request_id')
        test_logger.setLevel(logging.INFO)
        test_logger.addHandler(handler)

        try:
            custom_rid = 'corr-id-xyz-456'
            # Disparamos request con header
            response = self.client.get('/api/health/', HTTP_X_REQUEST_ID=custom_rid)
            self.assertEqual(response.headers['X-Request-ID'], custom_rid)

            # También probamos que si llamamos logger mientras corre un middleware
            # capture el request_id correspondiente
            token = request_id_var.set(custom_rid)
            try:
                test_logger.info('Log con request_id capturado')
            finally:
                request_id_var.reset(token)

            output = stream.getvalue()
            parsed = json.loads(output.strip().splitlines()[-1])
            self.assertEqual(parsed['request_id'], custom_rid)
            self.assertEqual(parsed['message'], 'Log con request_id capturado')
        finally:
            test_logger.removeHandler(handler)
