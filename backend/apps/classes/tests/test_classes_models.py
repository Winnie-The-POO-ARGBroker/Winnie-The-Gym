import datetime

from django.test import TestCase

from apps.classes.models import Clase


class ClaseTextChoicesTest(TestCase):

    def test_dia_lunes_is_lowercase(self):
        self.assertEqual(Clase.Dia.LUNES, 'lunes')

    def test_dia_martes_is_lowercase(self):
        self.assertEqual(Clase.Dia.MARTES, 'martes')

    def test_dia_miercoles_is_lowercase(self):
        self.assertEqual(Clase.Dia.MIERCOLES, 'miercoles')

    def test_dia_jueves_is_lowercase(self):
        self.assertEqual(Clase.Dia.JUEVES, 'jueves')

    def test_dia_viernes_is_lowercase(self):
        self.assertEqual(Clase.Dia.VIERNES, 'viernes')

    def test_dia_sabado_is_lowercase(self):
        self.assertEqual(Clase.Dia.SABADO, 'sabado')

    def test_dia_domingo_is_lowercase(self):
        self.assertEqual(Clase.Dia.DOMINGO, 'domingo')

    def test_categoria_funcional_value(self):
        self.assertEqual(Clase.Categoria.FUNCIONAL, 'funcional')

    def test_categoria_spinning_value(self):
        self.assertEqual(Clase.Categoria.SPINNING, 'spinning')

    def test_estado_activa_value(self):
        self.assertEqual(Clase.Estado.ACTIVA, 'activa')

    def test_estado_cancelada_value(self):
        self.assertEqual(Clase.Estado.CANCELADA, 'cancelada')

    def test_estado_finalizada_value(self):
        self.assertEqual(Clase.Estado.FINALIZADA, 'finalizada')

    def test_lowercase_dia_validates_against_choices(self):
        """A Clase created with lowercase dia should be valid against choices."""
        clase = Clase(
            nombre='Test',
            categoria=Clase.Categoria.FUNCIONAL,
            dia=Clase.Dia.LUNES,
            cupo_maximo=10,
        )
        # Validate that the dia value is in the choices
        valid_values = [v for v, _ in Clase.dia.field.choices]
        self.assertIn(clase.dia, valid_values)


class HoraTimeFieldTest(TestCase):

    def test_hora_is_timefield(self):
        field = Clase._meta.get_field('hora')
        self.assertEqual(field.get_internal_type(), 'TimeField')

    def test_hora_is_not_nullable(self):
        field = Clase._meta.get_field('hora')
        self.assertFalse(field.null)
