import random
from django.core.management.base import BaseCommand
from ...models import Results, Academicperformance
from ...constants import RsvCompetencies as COMP

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
        for field in COMP.list
        if getattr(result, field) is not None
    ]
    return sum(scores) / len(scores) if scores else 0.0


def generate_grade(mean: float) -> str:
    decide = random.randint(1, 10)

    if decide ==2 or decide == 3:
        score = random.randint(2, 3)    
    elif decide == 1:
        score = 5
    else:
        raw = round(mean / 130)          
        score = max(2, min(5, raw))  

    return GRADE_SCALE[score]


class Command(BaseCommand):
    help = 'Seed Academic performance with grades based on competency mean'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year', default='2024/2025',
            help='Учебный год (по умолчанию: 2024/2025)'
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