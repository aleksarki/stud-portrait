"""
portrait/endpoints/curriculum_end.py

Эндпоинт для суперадмина: запускает парсинг учебного плана ТюмГУ,
сохраняет результат в DisciplineCompetencyMapping.
"""

import threading
from datetime import timezone as tz

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..models import DisciplineCompetencyMapping, CurriculumParseLog
from ..curriculum_parser import parse_curriculum


# ──────────────────────────────────────────────────────────────────────────────
# Фоновый воркер
# ──────────────────────────────────────────────────────────────────────────────

def _run_parser(log_id: int, specialty_name: str) -> None:
    log = CurriculumParseLog.objects.get(pk=log_id)
    try:
        def _progress(step, cur=0, total=0):
            # обновляем только прогресс, но не трогаем статус
            CurriculumParseLog.objects.filter(pk=log_id).update(
                disciplines_found=total,
                disciplines_saved=cur,
            )

        result = parse_curriculum(
            specialty_name=specialty_name,
            progress_callback=_progress,
        )

        saved = 0
        for disc in result.disciplines:
            _, created = DisciplineCompetencyMapping.objects.update_or_create(
                disc_name=disc.name,
                defaults={
                    "rsv_competencies":      disc.rsv_competencies,
                    "standard_competencies": disc.standard_competencies,
                    "semester":              disc.semester,
                    # parsed_at
                },
            )
            saved += 1

        log.status = CurriculumParseLog.STATUS_SUCCESS
        log.disciplines_found = len(result.disciplines)
        log.disciplines_saved = saved
        log.source_url = result.source_url
        log.finished_at = timezone.now()
        log.save()

    except Exception as exc:
        import traceback
        log.status = CurriculumParseLog.STATUS_ERROR
        log.error_message = f"{exc}\n\n{traceback.format_exc()}"
        log.finished_at = timezone.now()
        log.save()


# ──────────────────────────────────────────────────────────────────────────────
# Эндпоинты
# ──────────────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def parse_curriculum_view(request):
    """
    POST /portrait/parse-curriculum/

    Запускает парсер в фоновом потоке.
    Возвращает сразу с log_id, чтобы фронтенд мог отслеживать прогресс.

    Body (необязательно):
    {
        "specialty_name": "Математическое обеспечение и администрирование информационных систем"
    }
    """
    import json
    body = {}
    try:
        body = json.loads(request.body or b"{}")
    except ValueError:
        pass

    specialty_name = body.get(
        "specialty_name",
        "Математическое обеспечение и администрирование информационных систем",
    )

    # Если уже идёт парсинг — не запускаем второй
    if CurriculumParseLog.objects.filter(status=CurriculumParseLog.STATUS_RUNNING).exists():
        running = CurriculumParseLog.objects.filter(
            status=CurriculumParseLog.STATUS_RUNNING
        ).first()
        return JsonResponse({
            "status": "already_running",
            "message": "Парсер уже запущен. Дождитесь завершения.",
            "log_id": running.pk,
        })

    log = CurriculumParseLog.objects.create(
        status=CurriculumParseLog.STATUS_RUNNING,
        source_url="",
    )

    t = threading.Thread(target=_run_parser, args=(log.pk, specialty_name), daemon=True)
    t.start()

    return JsonResponse({
        "status": "started",
        "message": "Парсер запущен в фоновом режиме",
        "log_id": log.pk,
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_parse_log(request):
    """
    GET /portrait/parse-curriculum/log/

    Возвращает последние 10 записей журнала и текущее состояние.
    Используется фронтендом для опроса прогресса.
    """
    logs = CurriculumParseLog.objects.all()[:10]
    return JsonResponse({
        "status": "success",
        "logs": [
            {
                "id":                 lg.pk,
                "status":             lg.status,
                "started_at":         lg.started_at.isoformat() if lg.started_at else None,
                "finished_at":        lg.finished_at.isoformat() if lg.finished_at else None,
                "disciplines_found":  lg.disciplines_found,
                "disciplines_saved":  lg.disciplines_saved,
                "source_url":         lg.source_url,
                "error_message":      lg.error_message,
            }
            for lg in logs
        ],
    }, json_dumps_params={"ensure_ascii": False})


@csrf_exempt
@require_http_methods(["GET"])
def get_saved_mappings(request):
    """
    GET /portrait/parse-curriculum/mappings/

    Возвращает все сохранённые маппинги дисциплин.
    Полезно для отладки и отображения в UI.
    """
    mappings = DisciplineCompetencyMapping.objects.all().order_by("disc_name")
    return JsonResponse({
        "status": "success",
        "count": mappings.count(),
        "mappings": [
            {
                "discipline":             m.disc_name,
                "rsv_competencies":       m.rsv_competencies,
                "standard_competencies":  m.standard_competencies,
                "semester":               m.semester,
                "parsed_at":              m.parsed_at.isoformat(),
            }
            for m in mappings
        ],
    }, json_dumps_params={"ensure_ascii": False})