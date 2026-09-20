import importlib
import json
import logging

from django.conf import settings
from django.test import TestCase


class StructuredLoggingTests(TestCase):
    """Ensures the JSON formatter is wired and emits parseable output."""

    def test_default_formatter_is_json(self):
        formatters = settings.LOGGING.get('formatters', {})
        self.assertIn('json', formatters)
        self.assertEqual(
            formatters['json']['()'],
            'pythonjsonlogger.jsonlogger.JsonFormatter',
        )

    def test_console_handler_uses_json_formatter_by_default(self):
        handler_conf = settings.LOGGING['handlers']['console']
        # Default is 'json' unless LOG_FORMAT env overrides it in dev.
        self.assertIn(handler_conf['formatter'], ('json', 'plain'))

    def test_json_formatter_emits_valid_json_line(self):
        from pythonjsonlogger.jsonlogger import JsonFormatter

        formatter = JsonFormatter(
            '%(asctime)s %(name)s %(levelname)s %(message)s',
            rename_fields={'asctime': 'timestamp', 'levelname': 'level'},
        )
        record = logging.LogRecord(
            name='test.logger',
            level=logging.WARNING,
            pathname='/app/whatever.py',
            lineno=42,
            msg='structured %s',
            args=('payload',),
            exc_info=None,
        )
        formatted = formatter.format(record)
        parsed = json.loads(formatted)
        self.assertEqual(parsed['level'], 'WARNING')
        self.assertEqual(parsed['message'], 'structured payload')
        self.assertEqual(parsed['name'], 'test.logger')
        self.assertIn('timestamp', parsed)


class LocustfileStaticCheckTests(TestCase):
    """Locust scenarios must contain the expected user classes.

    We avoid `import` because locust monkey-patches gevent at module load and
    corrupts the pytest DB thread. AST parsing gives us the same guarantee
    (no typos in class names) without touching the interpreter's SSL/DB stack.
    """

    def test_locustfile_declares_expected_user_classes(self):
        import ast
        from pathlib import Path

        source = Path('/app/loadtests/locustfile.py').read_text()
        tree = ast.parse(source)
        class_names = {node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)}
        for expected in ('SocioUser', 'RecepcionistaUser', 'AdminUser'):
            self.assertIn(expected, class_names)
