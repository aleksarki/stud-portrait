import random, uuid
from django.core.management.base import BaseCommand
from django.db import transaction
from portrait.models import (
    Institutions, Participants, Results, Course, 
    Specialties, Educationlevels, Studyforms
)

class Command(BaseCommand):
    help = 'Заполняет базу данных'

    def handle(self, *args, **kwargs):
        self.stdout.write("Заполнение")
        
        with transaction.atomic():

            def get_ref(model, name_field, value):
                obj, _ = model.objects.get_or_create(**{name_field: value})
                return obj

            inst = get_ref(Institutions, 'inst_name', "МГУ имени М.В. Ломоносова")
            spec = get_ref(Specialties, 'spec_name', "Информационные технологии")
            edu_lvl = get_ref(Educationlevels, 'edu_level_name', "Бакалавриат")
            form = get_ref(Studyforms, 'form_name', "Очная")

            comp_fields = [
                'res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
                'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
                'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
                'res_comp_client_focus', 'res_comp_communication'
            ]
            mot_fields = [
                'res_mot_autonomy', 'res_mot_altruism', 'res_mot_challenge', 'res_mot_salary',
                'res_mot_career', 'res_mot_creativity', 'res_mot_relationships', 'res_mot_recognition',
                'res_mot_affiliation', 'res_mot_self_development', 'res_mot_purpose', 'res_mot_cooperation',
                'res_mot_stability', 'res_mot_tradition', 'res_mot_management', 'res_mot_work_conditions'
            ]
            years = ["2024/2025", "2025/2026"]
            for year in years:
                is_current = (year == "2025/2026")
                score_range = (600, 700) if is_current else (400, 500)
                
                for i in range(30):
                    rsv_id = str(uuid.uuid4())[:12]

                    student = Participants.objects.create(
                        part_rsv_id=rsv_id,
                        part_gender=random.choice(['М', 'Ж']),
                        part_institution=inst,
                        part_spec=spec,
                        part_edu_level=edu_lvl,
                        part_form=form,
                        part_course_num=random.randint(1, 4)
                    )

                    res_values = {
                        'res_participant': student,
                        'res_institution': inst,
                        'res_year': year,
                        'res_course_num': student.part_course_num,
                    }
                    
                    for field in comp_fields:
                        res_values[field] = round(random.uniform(*score_range), 2)
                    for field in mot_fields:
                        bonus = 0
                        if student.part_course_num == 4 and field in ['res_mot_salary', 'res_mot_career']:
                            bonus = random.randint(100, 200)
                        # На 1 курсе альтруизм и причастность выше
                        if student.part_course_num == 1 and field in ['res_mot_altruism', 'res_mot_affiliation']:
                            bonus = random.randint(100, 200)

                        val = random.randint(100, 500) + bonus
                        res_values[field] = min(val, 700)

                    if random.random() < (0.75 if is_current else 0.4):
                        Course.objects.create(
                            course_participant=student,
                            course_leadership=random.choice([0, 1]),
                            course_self_dev=random.choice([0, 1]),
                            course_stress_resistance=random.choice([0, 1]),
                            course_planning_org=random.choice([0, 1]),
                            course_communication=random.choice([0, 1]),
                        )
        self.stdout.write(self.style.SUCCESS('База заполнена тестовыми данными'))