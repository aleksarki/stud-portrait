import pytest
from django.test import TestCase
from portrait.models import Students, Results

class TestStudentsModel(TestCase):
    def test_student_creation(self):
        student = Students(stud_name="Иванов Иван Иванович")
        student.save()
        self.assertEqual(student.stud_name, "Иванов Иван Иванович")
        self.assertIsNotNone(student.stud_id)
    
class TestResultsModel(TestCase):
    def setUp(self):
        self.student = Students.objects.create(stud_name="Тестов Тест Тестович")
    
    def test_result_creation(self):
        result = Results(
            res_stud=self.student,
            res_year=2024,
            res_uni_communication=385,
            res_uni_complex_thinking=490,
            res_mot_purpose=375,
            res_comp_digital_analysis=480
        )
        result.save()
        self.assertEqual(result.res_stud, self.student)
        self.assertEqual(result.res_year, 2024)
        self.assertEqual(result.res_uni_communication, 385)
        self.assertIsNotNone(result.res_id)

    def test_foreign_key_relationship(self):
        result = Results.objects.create(
            res_stud=self.student,
            res_year=2024
        )
        self.assertEqual(result.res_stud.stud_id, self.student.stud_id)
        self.assertEqual(result.res_stud.stud_name, self.student.stud_name)
