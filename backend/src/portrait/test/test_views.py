import pytest
import json
from django.test import TestCase, Client
from django.urls import reverse
from portrait.models import Students, Results

class TestStudentsView(TestCase):
    def setUp(self):
        self.client = Client()
        self.student1 = Students.objects.create(stud_name="Иван Иванов")
        self.student2 = Students.objects.create(stud_name="Петр Петров")
    
    def test_students_list_get(self):
        response = self.client.get(reverse('students'))
        
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['students']), 2)
        
        student_names = [s['stud_name'] for s in data['students']]
        self.assertIn("Иван Иванов", student_names)
        self.assertIn("Петр Петров", student_names)
    
    def test_students_list_wrong_method(self):
        response = self.client.post(reverse('students'))
        
        self.assertEqual(response.status_code, 405)
        data = response.json()
        self.assertEqual(data['status'], 'error')

class TestResultsView(TestCase):
    def setUp(self):
        self.client = Client()
        self.student = Students.objects.create(stud_name="Тестов Тест Тестович")
        self.result1 = Results.objects.create(
            res_stud=self.student,
            res_year=2023,
            res_uni_communication=380,
            res_uni_complex_thinking=385
        )
        self.result2 = Results.objects.create(
            res_stud=self.student,
            res_year=2024,
            res_uni_communication=490,
            res_uni_complex_thinking=488
        )
    
    def test_results_get_success(self):
        response = self.client.get(
            reverse('results'), 
            {'stud_id': self.student.stud_id}
        )
        
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['student']['stud_id'], self.student.stud_id)
        self.assertEqual(data['student']['stud_name'], self.student.stud_name)
        self.assertEqual(len(data['results']), 2)
        
        result_years = [r['res_year'] for r in data['results']]
        self.assertIn(2023, result_years)
        self.assertIn(2024, result_years)
    
    def test_results_data_structure(self):
        response = self.client.get(
            reverse('results'), 
            {'stud_id': self.student.stud_id}
        )
        
        data = response.json()
        result = data['results'][0]
        
        self.assertIn('res_id', result)
        self.assertIn('res_year', result)
        self.assertIn('res_uni_communication', result)
        self.assertIn('res_mot_purpose', result)
        self.assertIn('res_comp_digital_analysis', result)
        self.assertIn('res_prof_communication', result)

    def test_results_get_missing_stud_id(self):
        response = self.client.get(reverse('results'))
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data['status'], 'error')
    
    def test_results_get_invalid_stud_id(self):
        response = self.client.get(
            reverse('results'), 
            {'stud_id': 'invalid'}
        )
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data['status'], 'error')
    
    def test_results_get_nonexistent_student(self):
        response = self.client.get(
            reverse('results'), 
            {'stud_id': -1}
        )
        
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertEqual(data['status'], 'error')
    
    def test_results_wrong_method(self):
        response = self.client.post(reverse('results'))
        
        self.assertEqual(response.status_code, 405)
        data = response.json()
        self.assertEqual(data['status'], 'error')
    

