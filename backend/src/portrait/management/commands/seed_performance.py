import random
from django.core.management.base import BaseCommand
from portrait.models import Results, Academicperformance

COMP_FIELDS = [
    'res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
    'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
    'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
    'res_comp_client_focus', 'res_comp_communication', 'res_comp_passive_vocab',
]

COURSE_DISCIPLINES = {
    1: 'ПИР',
    2: 'УП',
    3: 'Эксплуатационная практика',
    4: 'Преддипломная практика',
}

GRADE_SCALE = {
    5: 'отл.',
    4: 'хор.',
    3: 'удовл.',
    2: 'неудовл.',
}


def get_mean_comp(result: Results) -> float:
    scores = [
        getattr(result, field)
        for field in COMP_FIELDS
        if getattr(result, field) is not None
    ]
    return sum(scores) / len(scores) if scores else 0.0


def generate_grade(mean: float) -> str:
    decide = random.randint(1, 10)

    if decide > 3:
        raw = round(mean / 150)          
        score = max(2, min(5, raw))      
    elif decide == 1:
        score = 5
    else:
        score = random.randint(2, 3)

    return GRADE_SCALE[score]


class Command(BaseCommand):
    help = 'Seed Academicperformance with grades based on competency mean'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year', default='2023/2024',
            help='Учебный год (по умолчанию: 2023/2024)'
        )
        parser.add_argument(
            '--clear', action='store_true',
            help='Удалить существующие записи перед генерацией'
        )

    def handle(self, *args, **options):
        study_year = options['year']
        
        if options['clear']:
            deleted, _ = Academicperformance.objects.filter(perf_year=study_year).delete()
            self.stdout.write(self.style.WARNING(f'Удалено записей: {deleted}'))

        results = Results.objects.select_related('res_participant').all()
        created_count = 0
        skipped_count = 0
        self.stdout.write('Заполнение...')
        for result in results:
            course = result.res_course_num
            discipline = COURSE_DISCIPLINES.get(course)

            if discipline is None:
                skipped_count += 1
                continue

            mean = get_mean_comp(result)
            grade = generate_grade(mean)

            _, created = Academicperformance.objects.get_or_create(
                perf_part=result.res_participant,
                perf_year=study_year,
                perf_discipline=discipline,
                defaults={'perf_main_attestation': grade},
            )

            if created:
                created_count += 1
            else:
                skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Данные записаны. Создано: {created_count}, пропущено/уже существует: {skipped_count}'
            )
        )