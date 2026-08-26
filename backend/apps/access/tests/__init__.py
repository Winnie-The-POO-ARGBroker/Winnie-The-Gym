# Re-export all test classes from the original flat test module so that
# any existing test runner configuration that imported from apps.access.tests
# continues to work.
from apps.access.tests.test_qr import DynamicQRAndAccessTestCase  # noqa: F401
