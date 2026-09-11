import threading


_thread_locals = threading.local()


def get_current_user():
    """Return the authenticated User of the ongoing request, or None."""
    return getattr(_thread_locals, 'user', None)


class CurrentUserMiddleware:
    """Store the request user in thread-local so signals can access it.

    Django signals (`post_save`, `post_delete`) do not receive the current
    request. This middleware exposes the authenticated user to
    `apps.common.audit` for the admin action trail.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = getattr(request, 'user', None) if request.user.is_authenticated else None
        try:
            return self.get_response(request)
        finally:
            _thread_locals.user = None
