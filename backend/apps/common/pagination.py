from rest_framework.pagination import PageNumberPagination


class PageSizePagination(PageNumberPagination):
    """Default page of 10 (same as the global setting) that honours ``?page_size=``.

    Screens that must show every record (selectors, small catalogs, history lists) ask for
    up to 1000 per page; without this class DRF ignores ``page_size`` and truncates at 10.
    """

    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 1000
