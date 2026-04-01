from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
from .common import *
from .ml_utils import (
    predict_competency_level,
    generate_interpretation,
    generate_recommendations,
    get_level_emoji,
    get_level_color,
    generate_general_interpretation_with_ai
)

@method('GET')
@csrf_exempt
def get_student_resume_data(request):
    try:
        student_id = request.GET.get('student_id')
        year = request.GET.get('year')
        with_ai = request.GET.get('with_ai', 'true').lower() == 'true'

        if not student_id:
            return JsonResponse({'status': 'error', 'message': 'student_id required'}, status=400)

        participant = Participants.objects.select_related('part_institution', 'part_spec', 'part_form', 'part_edu_level').get(part_id=student_id)

        results = Results.objects.filter(res_participant=participant)
        if year:
            results = results.filter(res_year=year)
        results = results.order_by('-res_year', '-res_course_num')
        if not results.exists():
            return JsonResponse({'status': 'error', 'message': 'No results'}, status=404)

        latest_result = results.first()

        resume_data = {
            'personal_info': {
                'name': participant.part_rsv_id or '',
                'gender': participant.part_gender or '',
                'student_id': student_id
            },
            'education': {
                'institution': participant.part_institution.inst_name if participant.part_institution else '',
                'direction': participant.part_spec.spec_name if participant.part_spec else '',
                'form': participant.part_form.form_name if participant.part_form else '',
                'level': participant.part_edu_level.edu_level_name if participant.part_edu_level else '',
                'course': participant.part_course_num
            },
            'competencies': [],
            'generated_at': datetime.now().isoformat(),
            'year': year or latest_result.res_year
        }

        competencies_order = [
            'res_comp_leadership', 'res_comp_communication', 'res_comp_self_development',
            'res_comp_result_orientation', 'res_comp_stress_resistance', 'res_comp_client_focus',
            'res_comp_planning', 'res_comp_info_analysis', 'res_comp_partnership',
            'res_comp_rules_compliance', 'res_comp_emotional_intel', 'res_comp_passive_vocab'
        ]

        all_scores = {}
        for comp_field in competencies_order:
            score = getattr(latest_result, comp_field, None)
            if score and score > 0:
                all_scores[comp_field] = score

        # Для каждой компетенции используем ТОЛЬКО шаблонные интерпретации (без AI)
        for comp_field in competencies_order:
            score = getattr(latest_result, comp_field, None)
            if not score or score == 0:
                continue
            comp_name = COMP.names[comp_field]
            course = latest_result.res_course_num or 1
            prediction = predict_competency_level(score, course, [s for cf, s in all_scores.items() if cf != comp_field])
            comp_data = {
                'field': comp_field,
                'name': comp_name,
                'score': score,
                'max_score': 800,
                'percentage': ((score - 200) / 600) * 100,
                'ai': {
                    'level': prediction['level'],
                    'level_code': prediction['level_code'],
                    'confidence': prediction['confidence'],
                    'percentile': prediction['percentile'],
                    'emoji': get_level_emoji(prediction['level']),
                    'color': get_level_color(prediction['level']),
                    'interpretation': generate_interpretation(score, prediction['level'], comp_name, course, prediction['percentile']),
                    'recommendations': generate_recommendations(comp_field, prediction['level'], course)
                }
            }
            resume_data['competencies'].append(comp_data)

        # Общая интерпретация (AI)
        if with_ai:
            competencies_dict = {comp['name']: comp['score'] for comp in resume_data['competencies']}
            try:
                general_text = generate_general_interpretation_with_ai(resume_data['education'], competencies_dict)
                resume_data['general_interpretation'] = general_text
            except Exception as e:
                print(f"General AI generation failed: {e}")
                resume_data['general_interpretation'] = None
        else:
            resume_data['general_interpretation'] = None

        return JsonResponse({'status': 'success', 'data': resume_data}, json_dumps_params={'ensure_ascii': False})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)