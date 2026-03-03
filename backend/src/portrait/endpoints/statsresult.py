# Модуль статистики и результатов.

from django.db.models import Count, Avg, Min, Q

from .common import *


# ====== ENDPOINTS ====== #

@method('GET')
@response
@csrf_exempt
def stats(request):
    """ Statistics for '/admin/stats' page
    """

    # Участники по году получения первой оценки  # fixme no longer needed ??
    first_year_stats = Results.objects.values('res_participant').annotate(
        first_year=Min('res_year')
    ).values('first_year').annotate(
        count=Count('res_participant')
    ).order_by('first_year')
    
    participants_by_first_year = {
        'years': [str(stat['first_year']) for stat in first_year_stats if stat['first_year']],
        'counts': [stat['count'] for stat in first_year_stats if stat['first_year']]
    }

    # Участники по центрам компетенций (топ-15)
    centers_stats = Results.objects.filter(
        res_center__isnull=False
    ).values('res_center__center_name').annotate(
        count=Count('res_participant', distinct=True)
    ).order_by('-count')[:15]
    
    participants_by_center = {
        'centers': [stat['res_center__center_name'] for stat in centers_stats if stat['res_center__center_name']],
        'counts': [stat['count'] for stat in centers_stats if stat['res_center__center_name']]
    }

    # Участники по учебным заведениям (топ-15)
    institutions_stats = Results.objects.filter(
        res_institution__isnull=False
    ).values('res_institution__inst_name').annotate(
        count=Count('res_participant', distinct=True)
    ).order_by('-count')[:15]
    
    participants_by_institution = {
        'institutions': [stat['res_institution__inst_name'] for stat in institutions_stats if stat['res_institution__inst_name']],
        'counts': [stat['count'] for stat in institutions_stats if stat['res_institution__inst_name']]
    }

    # Специальности участников
    specialties_stats = Results.objects.filter(
        res_spec__isnull=False
    ).values('res_spec__spec_name').annotate(
        count=Count('res_participant', distinct=True)
    ).order_by('-count')
    
    specialties_distribution = {
        'specialties': [stat['res_spec__spec_name'] for stat in specialties_stats if stat['res_spec__spec_name']],
        'counts': [stat['count'] for stat in specialties_stats if stat['res_spec__spec_name']]
    }

    # Динамика тестирований по годам
    tests_by_year = Results.objects.filter(
        res_year__isnull=False
    ).values('res_year').annotate(
        count=Count('res_id')
    ).order_by('res_year')
    
    tests_by_year_data = {
        'years': [str(stat['res_year']) for stat in tests_by_year if stat['res_year']],
        'counts': [stat['count'] for stat in tests_by_year if stat['res_year']]
    }
    
    competences_by_year = []
    for field in COMPETENCIES.keys():
        yearly_stats = Results.objects.filter(
            **{f'{field}__isnull': False},
            res_year__isnull=False
        ).values('res_year').annotate(
            avg_value=Avg(field)
        ).order_by('res_year')
        
        if yearly_stats:
            competences_by_year.append({
                'name': COMPETENCIES[field],
                'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
            })
    
    motivators_by_year = []
    for field in MOTIVATORS.keys():
        yearly_stats = Results.objects.filter(
            **{f'{field}__isnull': False},
            res_year__isnull=False
        ).values('res_year').annotate(
            avg_value=Avg(field)
        ).order_by('res_year')
        
        if yearly_stats:
            motivators_by_year.append({
                'name': MOTIVATORS[field],
                'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
            })
    
    values_by_year = []
    for field in VALUES.keys():
        yearly_stats = Results.objects.filter(
            **{f'{field}__isnull': False},
            res_year__isnull=False
        ).values('res_year').annotate(
            avg_value=Avg(field)
        ).order_by('res_year')
        
        if yearly_stats:
            values_by_year.append({
                'name': VALUES[field],
                'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
            })

    stats_data = {
        'totalParticipants':  Participants.objects.count(),
        'totalTests':         Results.objects.count(),
        'uniqueInstitutions': Institutions.objects.count(),
        'uniqueCenters':      CompetenceCenters.objects.count(),

        'participantsByFirstYear':   participants_by_first_year,
        'participantsByCenter':      participants_by_center,
        'participantsByInstitution': participants_by_institution,
        'specialtiesDistribution':   specialties_distribution,
        
        'testsByYear':       tests_by_year_data,
        'competencesByYear': competences_by_year,
        'motivatorsByYear':  motivators_by_year,
        'valuesByYear':      values_by_year
    }
    
    return {"stats": stats_data}


@method('GET')
@response
@csrf_exempt
def courses(request):
    """ Information about course completion for '/admin/courses' page
    """

    zeroIfNull = lambda value : float(value) if value is not None else 0
    
    courses_data = [
        {
            'course_id': course.course_id,
            'participant': {
                'part_id':     course.course_participant.part_id,
                'part_name':   course.course_participant.part_name,
                'part_gender': course.course_participant.part_gender,
                'institution': course.course_participant.part_institution.inst_name    if course.course_participant.part_institution else None,
                'specialty':   course.course_participant.part_spec.spec_name           if course.course_participant.part_spec        else None,
                'edu_level':   course.course_participant.part_edu_level.edu_level_name if course.course_participant.part_edu_level   else None,
                'study_form':  course.course_participant.part_form.form_name           if course.course_participant.part_form        else None,
            },
            # Данные по курсам
            'course_an_dec':                 zeroIfNull(course.course_an_dec),
            'course_client_focus':           zeroIfNull(course.course_client_focus),
            'course_communication':          zeroIfNull(course.course_communication),
            'course_leadership':             zeroIfNull(course.course_leadership),
            'course_result_orientation':     zeroIfNull(course.course_result_orientation),
            'course_planning_org':           zeroIfNull(course.course_planning_org),
            'course_rules_culture':          zeroIfNull(course.course_rules_culture),
            'course_self_dev':               zeroIfNull(course.course_self_dev),
            'course_collaboration':          zeroIfNull(course.course_collaboration),
            'course_stress_resistance':      zeroIfNull(course.course_stress_resistance),
            'course_emotions_communication': zeroIfNull(course.course_emotions_communication),
            'course_negotiations':           zeroIfNull(course.course_negotiations),
            'course_digital_comm':           zeroIfNull(course.course_digital_comm),
            'course_effective_learning':     zeroIfNull(course.course_effective_learning),
            'course_entrepreneurship':       zeroIfNull(course.course_entrepreneurship),
            'course_creativity_tech':        zeroIfNull(course.course_creativity_tech),
            'course_trendwatching':          zeroIfNull(course.course_trendwatching),
            'course_conflict_management':    zeroIfNull(course.course_conflict_management),
            'course_career_management':      zeroIfNull(course.course_career_management),
            'course_burnout':                zeroIfNull(course.course_burnout),
            'course_cross_cultural_comm':    zeroIfNull(course.course_cross_cultural_comm),
            'course_mentoring':              zeroIfNull(course.course_mentoring),
        }
        for course in Course.objects.all().select_related(
            'course_participant', 'course_participant__part_institution', 'course_participant__part_spec',
            'course_participant__part_edu_level', 'course_participant__part_form'
        )
    ]

    return {"courses": courses_data}


@method('GET')
@csrf_exempt
def students(request):  #  fix: dubious necessity; todo: confirm usage
    """ Get the list of all participants
    """

    participants_data = [
        {
            'stud_id':    participant.part_id,
            'stud_name':  participant.part_name,
            'stud_gender': participant.part_gender,
            'institution': participant.part_institution.inst_name   if participant.part_institution else None,
            'specialty':  participant.part_spec.spec_name           if participant.part_spec        else None,
            'edu_level':  participant.part_edu_level.edu_level_name if participant.part_edu_level   else None,
            'study_form': participant.part_form.form_name           if participant.part_form        else None,
            'course_num': participant.part_course_num
        }
        for participant in Participants.objects.all().select_related('part_institution', 'part_spec', 'part_edu_level', 'part_form')
    ]

    return successResponse({
        "students": participants_data,
        "total_count": len(participants_data)
    })


@method('GET')
@csrf_exempt
def student_results(request):  #  fix: dubious necessity; todo: confirm usage
    """ Get specific participant's results
    """

    stud_id = request.GET.get('stud_id')
    
    if not stud_id:
        raise ResponseError("stud_id parameter is required")
    
    try:
        stud_id = int(stud_id)
    except ValueError:
        raise ResponseError("stud_id must be an integer")
    
    try:
        participant = Participants.objects.select_related('part_institution', 'part_spec', 'part_edu_level', 'part_form').get(part_id=stud_id)
    except Participants.DoesNotExist:
        raise ResponseError("Student not found")

    zeroIfNull = lambda value : float(value) if value is not None else 0
    
    results_list = [
        {
            'res_id':             result.res_id,
            'res_year':           result.res_year,
            'res_course_num':     result.res_course_num,
            'res_high_potential': result.res_high_potential,
            'res_summary_report': result.res_summary_report,
            
            'center':      result.res_center.center_name       if result.res_center      else None,
            'institution': result.res_institution.inst_name    if result.res_institution else None,
            'edu_level':   result.res_edu_level.edu_level_name if result.res_edu_level   else None,
            'study_form':  result.res_form.form_name           if result.res_form        else None,
            'specialty':   result.res_spec.spec_name           if result.res_spec        else None,
            
            'res_comp_info_analysis':      result.res_comp_info_analysis,
            'res_comp_planning':           result.res_comp_planning,
            'res_comp_result_orientation': result.res_comp_result_orientation,
            'res_comp_stress_resistance':  result.res_comp_stress_resistance,
            'res_comp_partnership':        result.res_comp_partnership,
            'res_comp_rules_compliance':   result.res_comp_rules_compliance,
            'res_comp_self_development':   result.res_comp_self_development,
            'res_comp_leadership':         result.res_comp_leadership,
            'res_comp_emotional_intel':    result.res_comp_emotional_intel,
            'res_comp_client_focus':       result.res_comp_client_focus,
            'res_comp_communication':      result.res_comp_communication,
            'res_comp_passive_vocab':      result.res_comp_passive_vocab,
            
            'res_mot_autonomy':         zeroIfNull(result.res_mot_autonomy),
            'res_mot_altruism':         zeroIfNull(result.res_mot_altruism),
            'res_mot_challenge':        zeroIfNull(result.res_mot_challenge),
            'res_mot_salary':           zeroIfNull(result.res_mot_salary),
            'res_mot_career':           zeroIfNull(result.res_mot_career),
            'res_mot_creativity':       zeroIfNull(result.res_mot_creativity),
            'res_mot_relationships':    zeroIfNull(result.res_mot_relationships),
            'res_mot_recognition':      zeroIfNull(result.res_mot_recognition),
            'res_mot_affiliation':      zeroIfNull(result.res_mot_affiliation),
            'res_mot_self_development': zeroIfNull(result.res_mot_self_development),
            'res_mot_purpose':          zeroIfNull(result.res_mot_purpose),
            'res_mot_cooperation':      zeroIfNull(result.res_mot_cooperation),
            'res_mot_stability':        zeroIfNull(result.res_mot_stability),
            'res_mot_tradition':        zeroIfNull(result.res_mot_tradition),
            'res_mot_management':       zeroIfNull(result.res_mot_management),
            'res_mot_work_conditions':  zeroIfNull(result.res_mot_work_conditions),
            
            'res_val_honesty_justice': result.res_val_honesty_justice,
            'res_val_humanism': result.res_val_humanism,
            'res_val_patriotism': result.res_val_patriotism,
            'res_val_family': result.res_val_family,
            'res_val_health': result.res_val_health,
            'res_val_environment': result.res_val_environment,
        }
        for result in Results.objects.filter(res_participant=stud_id).select_related(
            'res_center', 'res_institution', 'res_edu_level', 'res_form', 'res_spec'
        )
    ]

    return {
        "student": {
            "stud_id": participant.part_id,
            "stud_name": participant.part_name,
            "stud_gender": participant.part_gender,
            "institution": participant.part_institution.inst_name if participant.part_institution else None,
            "specialty": participant.part_spec.spec_name if participant.part_spec else None,
            "edu_level": participant.part_edu_level.edu_level_name if participant.part_edu_level else None,
            "study_form": participant.part_form.form_name if participant.part_form else None,
            "course_num": participant.part_course_num
        },
        "results": results_list
    }


@method('GET')
@csrf_exempt
def get_institution_directions(request):  #  fix: dubious necessity; todo: confirm usage
    """
    Возвращает направления, которые есть в выбранных институтах.
    Извлекает уникальные пары (institution, direction) из таблицы Results.
    """
    try:
        institution_ids = request.GET.getlist('institution_ids[]')
        
        print(f"📊 get_institution_directions called with institutions: {institution_ids}")
        
        # Если институты не выбраны, возвращаем ВСЕ направления
        if not institution_ids or len(institution_ids) == 0:
            directions = Results.objects.filter(
                res_spec__isnull=False
            ).values_list(
                'res_spec__spec_name', flat=True
            ).distinct().order_by('res_spec__spec_name')
            
            directions_list = list(directions)
            print(f"✅ Нет фильтра по ВУЗам, вернули {len(directions_list)} направлений")
            
            return successResponse({
                "directions": directions_list
            })
        
        # Фильтруем направления по выбранным институтам
        directions = Results.objects.filter(
            res_institution__inst_id__in=institution_ids,
            res_spec__isnull=False
        ).values_list(
            'res_spec__spec_name', flat=True
        ).distinct().order_by('res_spec__spec_name')
        
        directions_list = list(directions)
        print(f"✅ Для ВУЗов {institution_ids} нашли {len(directions_list)} направлений")
        
        return successResponse({
            "directions": directions_list
        })
        
    except Exception as e:
        print(f"❌ Ошибка в get_institution_directions: {str(e)}")
        return exceptionResponse(e)


@method('GET')
@csrf_exempt
def get_filter_options_with_counts(request):  #  fix: dubious necessity; todo: confirm usage
    """
    Возвращает опции фильтров с количеством записей для каждой.
    С учётом уже выбранных фильтров (cross-filtering).
    
    ВАЖНО: Динамически подсчитывает максимальное количество прохождений!
    """
    try:
        session_id = request.GET.get('session_id')
        

        # Получаем текущие выбранные фильтры
        selected_institution_ids = request.GET.getlist('institution_ids[]')
        selected_directions = request.GET.getlist('directions[]')
        selected_courses = request.GET.getlist('courses[]')
        selected_test_attempts = request.GET.getlist('test_attempts[]')
        
        print(f"\n{'='*60}")
        print(f"📊 get_filter_options_with_counts вызван")
        print(f"   Текущие фильтры:")
        print(f"   - Институты: {selected_institution_ids}")
        print(f"   - Направления: {selected_directions}")
        print(f"   - Курсы: {selected_courses}")
        print(f"   - Прохождения: {selected_test_attempts}")
        print(f"{'='*60}\n")
        
        from django.db.models import Count
        
        # Базовый запрос (применяем все фильтры кроме текущего)
        base_results = Results.objects.select_related(
            'res_participant__part_institution',
            'res_participant__part_spec'
        )
        
        # ============================================================
        # ИНСТИТУТЫ с количеством (с учётом других фильтров)
        # ============================================================
        
        institutions_query = base_results
        
        # Применяем фильтры КРОМЕ институтов
        if selected_directions:
            institutions_query = institutions_query.filter(
                res_participant__part_spec__spec_name__in=selected_directions
            )
        
        if selected_courses:
            institutions_query = institutions_query.filter(
                res_course_num__in=selected_courses
            )
        
        if selected_test_attempts:
            # Фильтр по количеству прохождений
            student_attempts = Results.objects.values('res_participant').annotate(
                attempt_count=Count('res_id')
            )
            
            attempts_dict = {
                item['res_participant']: item['attempt_count'] 
                for item in student_attempts
            }
            
            valid_students = [
                student_id 
                for student_id, count in attempts_dict.items()
                if str(count) in selected_test_attempts
            ]
            
            institutions_query = institutions_query.filter(
                res_participant__in=valid_students
            )
        
        institutions_counts = institutions_query.values(
            'res_participant__part_institution__inst_id',
            'res_participant__part_institution__inst_name'
        ).annotate(
            count=Count('res_id')
        ).order_by('-count')  # Сортировка по количеству (больше → меньше)
        
        institutions_list = [
            {
                'id': item['res_participant__part_institution__inst_id'],
                'name': item['res_participant__part_institution__inst_name'],
                'count': item['count']
            }
            for item in institutions_counts
            if item['res_participant__part_institution__inst_name']
        ]
        
        print(f"✅ Институты: {len(institutions_list)} (отсортировано по количеству)")
        
        # ============================================================
        # НАПРАВЛЕНИЯ с количеством (с учётом других фильтров)
        # ============================================================
        
        directions_query = base_results
        
        # Применяем фильтры КРОМЕ направлений
        if selected_institution_ids:
            directions_query = directions_query.filter(
                res_participant__part_institution__inst_id__in=selected_institution_ids
            )
        
        if selected_courses:
            directions_query = directions_query.filter(
                res_course_num__in=selected_courses
            )
        
        if selected_test_attempts:
            student_attempts = Results.objects.values('res_participant').annotate(
                attempt_count=Count('res_id')
            )
            
            attempts_dict = {
                item['res_participant']: item['attempt_count'] 
                for item in student_attempts
            }
            
            valid_students = [
                student_id 
                for student_id, count in attempts_dict.items()
                if str(count) in selected_test_attempts
            ]
            
            directions_query = directions_query.filter(
                res_participant__in=valid_students
            )
        
        directions_counts = directions_query.values(
            'res_participant__part_spec__spec_name'
        ).annotate(
            count=Count('res_id')
        ).order_by('-count')
        
        directions_list = [
            {
                'id': item['res_participant__part_spec__spec_name'],  # id = name для строк
                'name': item['res_participant__part_spec__spec_name'],
                'count': item['count']
            }
            for item in directions_counts
            if item['res_participant__part_spec__spec_name']
        ]
        
        print(f"✅ Направления: {len(directions_list)} (отсортировано по количеству)")
        
        # ============================================================
        # КУРСЫ с количеством (с учётом других фильтров)
        # ============================================================
        
        courses_query = base_results
        
        # Применяем фильтры КРОМЕ курсов
        if selected_institution_ids:
            courses_query = courses_query.filter(
                res_participant__part_institution__inst_id__in=selected_institution_ids
            )
        
        if selected_directions:
            courses_query = courses_query.filter(
                res_participant__part_spec__spec_name__in=selected_directions
            )
        
        if selected_test_attempts:
            student_attempts = Results.objects.values('res_participant').annotate(
                attempt_count=Count('res_id')
            )
            
            attempts_dict = {
                item['res_participant']: item['attempt_count'] 
                for item in student_attempts
            }
            
            valid_students = [
                student_id 
                for student_id, count in attempts_dict.items()
                if str(count) in selected_test_attempts
            ]
            
            courses_query = courses_query.filter(
                res_participant__in=valid_students
            )
        
        courses_counts = courses_query.values('res_course_num').annotate(
            count=Count('res_id')
        ).order_by('res_course_num')
        
        courses_list = [
            {
                'id': item['res_course_num'],
                'name': f"{item['res_course_num']} курс",
                'count': item['count']
            }
            for item in courses_counts
            if item['res_course_num']
        ]
        
        print(f"✅ Курсы: {len(courses_list)}")
        
        # ============================================================
        # КОЛИЧЕСТВО ПРОХОЖДЕНИЙ (ДИНАМИЧЕСКИЙ ПОДСЧЁТ!)
        # ============================================================
        
        attempts_query = base_results
        
        # Применяем фильтры КРОМЕ прохождений
        if selected_institution_ids:
            attempts_query = attempts_query.filter(
                res_participant__part_institution__inst_id__in=selected_institution_ids
            )
        
        if selected_directions:
            attempts_query = attempts_query.filter(
                res_participant__part_spec__spec_name__in=selected_directions
            )
        
        if selected_courses:
            attempts_query = attempts_query.filter(
                res_course_num__in=selected_courses
            )
        
        # Подсчитываем количество замеров для каждого студента
        student_attempts = attempts_query.values('res_participant').annotate(
            attempt_count=Count('res_id')
        )
        
        # Группируем по количеству прохождений
        from collections import defaultdict
        attempts_distribution = defaultdict(int)
        
        for item in student_attempts:
            attempts_distribution[item['attempt_count']] += 1
        
        # ДИНАМИЧЕСКИ определяем максимум
        max_attempts = max(attempts_distribution.keys()) if attempts_distribution else 6
        
        print(f"🔍 Максимальное количество прохождений: {max_attempts}")
        print(f"   Распределение: {dict(attempts_distribution)}")
        
        # Формируем список (сортировка по количеству прохождений)
        test_attempts_list = [
            {
                'id': attempts,
                'name': f"{attempts} прохождение" if attempts == 1 else f"{attempts} прохождения",
                'count': students_count
            }
            for attempts, students_count in sorted(attempts_distribution.items())
        ]
        
        print(f"✅ Прохождений: {len(test_attempts_list)} (от 1 до {max_attempts})")
        
        # Компетенции с русскими названиями
        competencies_data = [
            {"id": "res_comp_info_analysis", "name": "Анализ информации"},
            {"id": "res_comp_planning", "name": "Планирование"},
            {"id": "res_comp_result_orientation", "name": "Ориентация на результат"},
            {"id": "res_comp_stress_resistance", "name": "Стрессоустойчивость"},
            {"id": "res_comp_partnership", "name": "Партнёрство"},
            {"id": "res_comp_rules_compliance", "name": "Соблюдение правил"},
            {"id": "res_comp_self_development", "name": "Саморазвитие"},
            {"id": "res_comp_leadership", "name": "Лидерство"},
            {"id": "res_comp_emotional_intel", "name": "Эмоциональный интеллект"},
            {"id": "res_comp_client_focus", "name": "Клиентоориентированность"},
            {"id": "res_comp_communication", "name": "Коммуникация"},
            {"id": "res_comp_passive_vocab", "name": "Пассивный словарь"},
        ]

        competencies_list = []

        for comp_info in competencies_data:
            comp_field = comp_info["id"]
            
            # Подсчитываем ненулевые значения
            count = Results.objects.exclude(
                Q(**{f"{comp_field}__isnull": True}) | Q(**{comp_field: 0})
            ).count()
            
            competencies_list.append({
                "id": comp_field,
                "name": comp_info["name"],
                "count": count
            })

        print(f"✅ Компетенции: {len(competencies_list)}")


        students_query = Participants.objects.annotate(
            results_count=Count('results')
        ).filter(
            results_count__gt=0
        ).order_by('part_name')[:1000]  # Ограничиваем 1000 для производительности

        students_list = [
            {
                'id': student.part_id,
                'name': f"{student.part_name} (ID: {student.part_id})",
                'count': student.results_count
            }
            for student in students_query
        ]

        print(f"✅ Студенты: {len(students_list)}")

        return successResponse({
            "data": {
                "institutions": institutions_list,
                "directions": directions_list,
                "courses": courses_list,
                "test_attempts": test_attempts_list,
                "competencies": competencies_list,  # ← С count!
                "students": students_list,  # ← ДОБАВЛЕНО!
                "max_attempts": max_attempts
            }
        })
        
    except Exception as e:
        print(f"❌ Ошибка в get_filter_options_with_counts: {str(e)}")
        import traceback
        traceback.print_exc()
        return exceptionResponse(e)
