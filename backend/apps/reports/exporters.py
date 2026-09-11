"""Format-agnostic report exporters (CSV / XLSX / PDF).

Each exporter takes a title, a list of column headers and an iterable of rows
(list-of-lists) and returns a Django HttpResponse ready to be streamed.
"""
import csv
import io

from django.http import HttpResponse


CSV_CONTENT_TYPE = 'text/csv; charset=utf-8'
XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
PDF_CONTENT_TYPE = 'application/pdf'


def _filename(slug, extension):
    return f'{slug}.{extension}'


def export_csv(slug, headers, rows):
    response = HttpResponse(content_type=CSV_CONTENT_TYPE)
    response['Content-Disposition'] = f'attachment; filename="{_filename(slug, "csv")}"'
    writer = csv.writer(response)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    return response


def export_xlsx(slug, title, headers, rows):
    from openpyxl import Workbook  # imported lazily

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = title[:31] or 'Reporte'
    sheet.append(headers)
    for row in rows:
        sheet.append(row)

    buffer = io.BytesIO()
    workbook.save(buffer)
    response = HttpResponse(buffer.getvalue(), content_type=XLSX_CONTENT_TYPE)
    response['Content-Disposition'] = f'attachment; filename="{_filename(slug, "xlsx")}"'
    return response


def export_pdf(slug, title, headers, rows):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(f'<b>{title}</b>', styles['Title']),
        Spacer(1, 12),
    ]
    data = [headers] + [[('' if v is None else str(v)) for v in row] for row in rows]
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#735d3e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(table)
    doc.build(elements)

    response = HttpResponse(buffer.getvalue(), content_type=PDF_CONTENT_TYPE)
    response['Content-Disposition'] = f'attachment; filename="{_filename(slug, "pdf")}"'
    return response


FORMAT_HANDLERS = {
    'csv': lambda slug, title, headers, rows: export_csv(slug, headers, rows),
    'xlsx': lambda slug, title, headers, rows: export_xlsx(slug, title, headers, rows),
    'pdf': lambda slug, title, headers, rows: export_pdf(slug, title, headers, rows),
}


def export(fmt, slug, title, headers, rows):
    handler = FORMAT_HANDLERS.get((fmt or 'csv').lower())
    if handler is None:
        raise ValueError(f'Formato de exportación no soportado: {fmt}')
    return handler(slug, title, headers, rows)
