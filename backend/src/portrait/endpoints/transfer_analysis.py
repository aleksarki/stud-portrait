"""
Эндпоинты для анализа студентов, сменивших направление или вуз.

Логика определения перевода:
  Студент считается "переведённым" если между двумя соседними записями Results
  изменился res_institution_id (смена вуза) или res_spec_id (смена направления).
  Сравниваем записи, отсортированные по res_year.

Endpoints:
  GET  /portrait/analyze-transfers/         — сводная статистика + данные для Санки
  POST /portrait/analyze-transfer-students/ — детальный список студентов с динамикой
"""

import json
from collections import defaultdict

import numpy as np
from django.db.models import Avg, Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .common import *


def _year_sort_key(year_str):
    """'2023/2024' → 2023; для сортировки."""
    try:
        return int(str(year_str).split('/')[0])
    except Exception:
        return 0


def _detect_transfers(results_sorted):
    """
    Принимает список Result-объектов, отсортированных по году.
    Возвращает список событий перевода:
      { 'year': str, 'from_inst': str, 'to_inst': str,
        'from_dir': str,  'to_dir': str,
        'type': 'institution' | 'direction' | 'both' }
    """
    events = []
    for i in range(1, len(results_sorted)):
        prev, curr = results_sorted[i - 1], results_sorted[i]

        prev_inst = prev.res_institution
        curr_inst = curr.res_institution
        prev_spec = prev.res_edu_specialty
        curr_spec = curr.res_edu_specialty

        inst_changed = prev_inst and curr_inst and prev_inst != curr_inst
        spec_changed = prev_spec and curr_spec and prev_spec != curr_spec

        if inst_changed or spec_changed:
            transfer_type = (
                'both'        if inst_changed and spec_changed else
                'institution' if inst_changed else
                'direction'
            )
            events.append({
                'year':      curr.res_year,
                'from_inst': prev.res_institution.inst_name if prev.res_institution else '—',
                'to_inst':   curr.res_institution.inst_name if curr.res_institution else '—',
                'from_dir':  prev.res_spec.spec_name        if prev.res_spec        else '—',
                'to_dir':    curr.res_spec.spec_name        if curr.res_spec        else '—',
                'type':      transfer_type,
            })
    return events


def _avg_comp(result):
    """Среднее по всем компетенциям для одного Result."""
    vals = [getattr(result, f) for f in COMP.list if getattr(result, f)]
    return float(np.mean(vals)) if vals else None


# ──────────────────────────────────────────────────────────────
#  GET /portrait/analyze-transfers/
# ──────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["GET"])
def analyze_transfers(request):
    """
    Сводный анализ переводов.

    Query params:
      institution_id — фильтр по вузу (необязательно)
      competency     — компетенция для детального анализа (default: res_comp_leadership)
      transfer_type  — 'institution' | 'direction' | 'both' | '' (все)

    Возвращает:
      summary        — общая статистика
      sankey         — данные для диаграммы Санки (потоки переводов между вузами/направлениями)
      dynamics       — средние компетенции до/после перевода по курсам
      by_type        — разбивка по типу перевода
    """
    try:
        institution_id = request.GET.get('institution_id')
        competency     = request.GET.get('competency', 'res_comp_leadership')
        transfer_type  = request.GET.get('transfer_type', '')

        if competency not in COMP.list:
            competency = COMP.LEADERSHIP

        # Берём всех участников у которых есть хотя бы 2 результата
        qs = (
            Participants.objects
            .prefetch_related('results_set')
            .annotate(result_count=Count('results'))
            .filter(result_count__gte=2)
        )
        if institution_id:
            # Участники у которых хоть одна запись Results в этом вузе
            qs = qs.filter(results__res_institution_id=institution_id).distinct()

        # ── Находим студентов с переводами ──────────────────────
        transfer_students = []   # (participant, events, results_sorted)

        for participant in qs:
            results_sorted = sorted(
                participant.results_set.select_related('res_institution', 'res_spec').all(),
                key=lambda r: _year_sort_key(r.res_year)
            )
            if len(results_sorted) < 2:
                continue
            events = _detect_transfers(results_sorted)
            if not events:
                continue
            if transfer_type and not any(e['type'] == transfer_type or transfer_type == 'both' for e in events):
                continue
            transfer_students.append((participant, events, results_sorted))

        total_transfers = len(transfer_students)

        # ── Санки ────────────────────────────────────────────────
        # Узлы = уникальные (вуз, направление)-пары; потоки = переводы
        node_set    = {}   # label → index
        sankey_links_raw = defaultdict(float)  # (from_idx, to_idx) → count

        for _part, events, results_sorted in transfer_students:
            for ev in events:
                from_label = f"{ev['from_inst']} / {ev['from_dir']}"
                to_label   = f"{ev['to_inst']}   / {ev['to_dir']}"

                for label in (from_label, to_label):
                    if label not in node_set:
                        node_set[label] = len(node_set)

                key = (node_set[from_label], node_set[to_label])
                sankey_links_raw[key] += 1

        sankey_nodes = [{'name': label} for label in node_set]
        sankey_links = [
            {'source': src, 'target': tgt, 'value': float(val)}
            for (src, tgt), val in sankey_links_raw.items()
            if src != tgt and val > 0
        ]
        sankey = {'nodes': sankey_nodes, 'links': sankey_links}

        # ── Динамика компетенций до/после перевода ───────────────
        # Для каждого студента: записи до первого перевода и после
        before_scores = []   # [avg_comp, ...]
        after_scores  = []

        course_dynamics = defaultdict(list)  # course_num → [score]

        for _part, events, results_sorted in transfer_students:
            first_transfer_year = events[0]['year']
            before = [r for r in results_sorted if _year_sort_key(r.res_year) < _year_sort_key(first_transfer_year)]
            after  = [r for r in results_sorted if _year_sort_key(r.res_year) >= _year_sort_key(first_transfer_year)]

            if before:
                val = _avg_comp(before[-1])
                if val: before_scores.append(val)
            if after:
                val = _avg_comp(after[0])
                if val: after_scores.append(val)

            # Баллы по конкретной компетенции в разрезе курсов
            for r in results_sorted:
                score = getattr(r, competency, None)
                if score and r.res_course_num:
                    course_dynamics[r.res_course_num].append(float(score))

        dynamics = [
            {
                'course':       course,
                'avg_score':    round(float(np.mean(scores)), 1),
                'n_students':   len(scores),
            }
            for course, scores in sorted(course_dynamics.items())
        ]

        # ── Разбивка по типу ─────────────────────────────────────
        by_type = defaultdict(int)
        for _, events, _ in transfer_students:
            for ev in events:
                by_type[ev['type']] += 1

        # ── Средние до/после ────────────────────────────────────
        avg_before = round(float(np.mean(before_scores)), 1) if before_scores else None
        avg_after  = round(float(np.mean(after_scores)),  1) if after_scores  else None

        return JsonResponse({
            'status': 'success',
            'summary': {
                'total_transfer_students': total_transfers,
                'avg_comp_before_transfer': avg_before,
                'avg_comp_after_transfer':  avg_after,
                'delta': round(avg_after - avg_before, 1) if avg_before and avg_after else None,
            },
            'sankey':   sankey,
            'dynamics': dynamics,
            'by_type':  dict(by_type),
            'competency': competency,
            'competency_name': COMP.names.get(competency, competency),
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


# ──────────────────────────────────────────────────────────────
#  POST /portrait/analyze-transfer-students/
# ──────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def analyze_transfer_students(request):
    """
    Детальный список студентов с историей переводов и динамикой компетенций.

    Body: {
        "institution_id": 1,          // необязательно
        "competency": "res_comp_leadership",
        "transfer_type": "",          // '' | 'institution' | 'direction' | 'both'
        "limit": 50
    }

    Возвращает список студентов:
      [ { rsv_id, transfers: [...], trajectory: [{year, course, score, institution, direction}] } ]
    """
    try:
        body           = json.loads(request.body)
        institution_id = body.get('institution_id')
        competency     = body.get('competency', 'res_comp_leadership')
        transfer_type  = body.get('transfer_type', '')
        limit          = min(int(body.get('limit', 50)), 200)

        if competency not in COMP.list:
            competency = COMP.LEADERSHIP

        qs = (
            Participants.objects
            .annotate(result_count=Count('results'))
            .filter(result_count__gte=2)
        )
        if institution_id:
            qs = qs.filter(results__res_institution_id=institution_id).distinct()

        students_out = []

        for participant in qs:
            results_sorted = sorted(
                participant.results_set.select_related('res_institution', 'res_spec').all(),
                key=lambda r: _year_sort_key(r.res_year)
            )
            if len(results_sorted) < 2:
                continue

            events = _detect_transfers(results_sorted)
            if not events:
                continue
            if transfer_type and not any(e['type'] == transfer_type for e in events):
                continue

            # Траектория: одна точка на каждый Result
            trajectory = []
            for r in results_sorted:
                score = getattr(r, competency, None)
                trajectory.append({
                    'year':        r.res_year,
                    'course':      r.res_course_num,
                    'score':       float(score) if score else None,
                    'institution': r.res_institution.inst_name if r.res_institution else '—',
                    'direction':   r.res_spec.spec_name        if r.res_spec        else '—',
                })

            students_out.append({
                'part_id':   participant.part_id,
                'rsv_id':    participant.part_rsv,
                'transfers': events,
                'trajectory': trajectory,
            })

            if len(students_out) >= limit:
                break

        return JsonResponse({
            'status':   'success',
            'students': students_out,
            'total':    len(students_out),
            'competency': competency,
            'competency_name': COMP.names.get(competency, competency),
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)