"""#192 — Receipt PDF builder using reportlab.

Build a single-page payment receipt PDF for a Pago instance.
"""
import io


def build_recibo_pdf(pago):
    """Return a BytesIO containing the receipt PDF for the given Pago.

    The PDF includes:
      - Gym name (from GymConfig)
      - Socio name and DNI
      - Plan and covered period (via linked Membresia or plan name)
      - Amount, payment method, MercadoPago payment ID (if applicable)
      - Receipt number and issue date
      - Legal disclaimer
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from django.utils import timezone

    from apps.common.models import GymConfig

    gym = GymConfig.get()
    socio = pago.socio
    plan = pago.plan
    membresia = pago.membresia

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ReceiptTitle',
        parent=styles['Title'],
        fontSize=18,
        textColor=colors.HexColor('#735d3e'),
        spaceAfter=8,
    )
    header_style = ParagraphStyle(
        'ReceiptHeader',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#4a4a4a'),
        spaceAfter=4,
    )
    small_style = ParagraphStyle(
        'ReceiptSmall',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#888888'),
    )

    numero = pago.numero_comprobante or 'S/N'
    fecha_emision = (pago.paid_at or pago.created_at)
    if fecha_emision:
        local_fecha = fecha_emision.astimezone(timezone.get_current_timezone())
        fecha_str = local_fecha.strftime('%d/%m/%Y %H:%M')
    else:
        fecha_str = '-'

    # Period covered via linked Membresia or fallback
    if membresia:
        periodo = f'{membresia.fecha_inicio.strftime("%d/%m/%Y")} — {membresia.fecha_fin.strftime("%d/%m/%Y")}'
    else:
        periodo = '-'

    metodo_display = pago.get_metodo_display()
    medio_display = pago.get_medio_manual_display() if pago.medio_manual else ''
    if medio_display:
        metodo_display = f'{metodo_display} ({medio_display})'

    elements = [
        Paragraph(gym.nombre_gym, title_style),
        Paragraph(f'Comprobante de Pago N° {numero}', header_style),
        Spacer(1, 10),
    ]

    data = [
        ['Campo', 'Detalle'],
        ['N° de Comprobante', numero],
        ['Fecha de emisión', fecha_str],
        ['Socio', f'{socio.apellido}, {socio.nombre}'],
        ['DNI', str(socio.dni)],
        ['Plan', plan.nombre],
        ['Período cubierto', periodo],
        ['Monto', f'ARS {pago.monto:,.2f}'],
        ['Medio de pago', metodo_display],
    ]

    if pago.mp_payment_id:
        data.append(['MP Payment ID', pago.mp_payment_id])

    if pago.observacion:
        data.append(['Observación', pago.observacion])

    table = Table(data, colWidths=[5 * cm, 11 * cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#735d3e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f6f2')]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(
        'Comprobante de pago — Documento no válido como factura.',
        small_style,
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
