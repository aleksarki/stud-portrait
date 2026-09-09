import random, uuid
from django.core.management.base import BaseCommand
from django.db import transaction
from portrait.models import (
    Institutions, Participants, Results, Course, 
    Specialties, Educationlevels, Studyforms, Academicperformance
)

class Command(BaseCommand):
    help = 'Заполняет базу данных'

    def handle(self, *args, **kwargs):
        self.stdout.write("Заполнение..")

        with transaction.atomic():
            #Results.objects.all().delete()

            def get_ref(model, name_field, value):
                obj, _ = model.objects.get_or_create(**{name_field: value})
                return obj

            institutions_data = [
                ("МГУ имени М.В. Ломоносова", ["Информационные технологии", "Психология", "Экономика"]),
                ("МГТУ им. Н.Э. Баумана", ["Робототехника", "Информационные технологии", "Машиностроение"]),
                ("НИУ ВШЭ", ["Дизайн", "Экономика", "Программная инженерия", "Управление бизнесом"]),
                ("СПбГУ", ["Юриспруденция", "Международные отношения", "Филология"]),
                ("УрФУ", ["Металлургия", "Строительство", "Информационные технологии"])
            ]

            edu_levels = ["Бакалавриат", "Магистратура", "Специалитет"]
            study_forms = ["Очная", "Заочная", "Очно-заочная"]

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

            years = ["2022/2023", "2023/2024","2024/2025", "2025/2026"]

            for year in years:
                is_current = (year == "2025/2026")
                score_range = (600, 700) if is_current else (300, 600)

                for i in range(1000):
                    inst_name, specs_list = random.choice(institutions_data)
                    spec_name = random.choice(specs_list)

                    inst_obj = get_ref(Institutions, 'inst_name', inst_name)
                    spec_obj = get_ref(Specialties, 'spec_name', spec_name)
                    edu_lvl_obj = get_ref(Educationlevels, 'edu_level_name', random.choice(edu_levels))
                    form_obj = get_ref(Studyforms, 'form_name', random.choice(study_forms))

                    rsv_id = str(uuid.uuid4())[:12]

                    # Создаем участника
                    student = Participants.objects.create(
                        part_rsv_id=rsv_id,
                        part_gender=random.choice(['М', 'Ж']),
                        part_institution=inst_obj,
                        part_spec=spec_obj,
                        part_edu_level=edu_lvl_obj,
                        part_form=form_obj,
                        part_course_num=random.randint(1, 4)
                    )

                    res_values = {
                        'res_participant': student,
                        'res_institution': inst_obj,
                        'res_year': year,
                        'res_course_num': student.part_course_num,
                    }

                    # Генерация компетенций
                    for field in comp_fields:
                        res_values[field] = round(random.uniform(*score_range), 2)

                    for field in mot_fields:
                        bonus = 0
                        if student.part_course_num == 4 and field in ['res_mot_salary', 'res_mot_career']:
                            bonus = random.randint(100, 200)
                        if student.part_course_num == 1 and field in ['res_mot_altruism', 'res_mot_affiliation']:
                            bonus = random.randint(100, 200)

                        val = random.randint(100, 500) + bonus
                        res_values[field] = min(val, 700)

                    Results.objects.create(**res_values)


                    if random.random() < (0.75 if is_current else 0.4):
                        Course.objects.create(
                            course_participant=student,
                            course_leadership=random.choice([0, 1]),
                            course_self_dev=random.choice([0, 1]),
                            course_stress_resistance=random.choice([0, 1]),
                            course_planning_org=random.choice([0, 1]),
                            course_communication=random.choice([0, 1]),
                        )

                    disciplines_map = {
                        "Информационные технологии": ["Программирование", "Алгоритмы", "Базы данных"],
                        "Экономика": ["Микроэкономика", "Макроэкономика", "Статистика"],
                        "Психология": ["Общая психология", "Психофизиология", "Антропология"],
                        "Юриспруденция": ["Гражданское право", "Уголовное право", "Теория государства и права"],
                    }

                    # Выбираем дисциплины для студента на основе его специальности
                    available_disciplines = disciplines_map.get(spec_name, ["Общая дисциплина", "История", "Философия"])
                    selected_disciplines = random.sample(available_disciplines, k=random.randint(2, 3))

                    for disc in selected_disciplines:
                        avg_score = round(random.uniform(2.5, 5.0), 2)
                        dig_culture = round(random.uniform(3.0, 5.0), 2)

#'отл.', 'хор.', 'удовл.', 'неудовл.', 'не явился'
                        if avg_score >= 4.5:
                            main_grade = "отл."
                            first_retake = None
                            final_grade = "отл."
                        elif avg_score >= 3.5:
                            main_grade = "хор."
                            first_retake = None
                            final_grade = "хор."
                        elif avg_score >= 2.8:
                            main_grade = "удовл."
                            first_retake = None
                            final_grade = "удовл."
                        else:
                            main_grade = "неудовл."
                            first_retake = random.choice(["удовл.", "хор."])
                            final_grade = first_retake

                        Academicperformance.objects.create(
                            perf_part=student,
                            perf_year=year,
                            perf_discipline=disc,
                            perf_current_avg=avg_score,
                            perf_digital_culture=dig_culture,
                            perf_main_attestation=main_grade,
                            perf_first_retake=first_retake,
                            perf_second_retake=None,
                            perf_high_grade_retake=None,
                            perf_final_grade=final_grade
                        )
        self.stdout.write(self.style.SUCCESS('База заполнена тестовыми данными'))