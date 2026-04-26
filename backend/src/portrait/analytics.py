"""
Аналитические выборки для анализа компетенций студентов.
Реализует:
- Прирост компетенций между учебными периодами
- Демографическую статистику
- Сравнение средних баллов между организациями
"""

from django.db.models import Avg, Count, Q, F, FloatField, ExpressionWrapper
from django.db.models.functions import Coalesce
from django.db import connection
from portrait.models import Results, Participants, Institutions
from portrait.constants import RsvCompetencies


class CompetencyAnalytics:
    """Аналитика по компетенциям."""

    @staticmethod
    def get_competency_growth(
        rsv_id: str,
        period_before: str,
        period_after: str,
        competencies: list = None
    ) -> dict:
        """
        Анализ прироста компетенций студента между двумя периодами.
        
        :param rsv_id: ID студента в системе РСВ
        :param period_before: Год/период "до" (напр. "2023")
        :param period_after: Год/период "после" (напр. "2024")
        :param competencies: Список полей компетенций для анализа (опционально)
        :return: dict с приростом по каждой компетенции
        """
        if competencies is None:
            competencies = [
                RsvCompetencies.INFO_ANALYSIS,
                RsvCompetencies.PLANNING,
                RsvCompetencies.RESULT_ORIENT,
                RsvCompetencies.STRESS_RESIST,
                RsvCompetencies.PARTNERSHIP,
                RsvCompetencies.RULE_COMPLY,
                RsvCompetencies.SELF_DEVELOP,
                RsvCompetencies.LEADERSHIP,
                RsvCompetencies.EMOTE_INTEL,
                RsvCompetencies.CLIENT_FOCUS,
                RsvCompetencies.COMMUNICATION,
                RsvCompetencies.PASSIVE_VOCAB,
            ]

        # Получаем результаты за оба периода
        results_before = Results.objects.filter(
            res_year=period_before,
            res_participant__part_rsv_id=rsv_id
        ).first()
        
        results_after = Results.objects.filter(
            res_year=period_after,
            res_participant__part_rsv_id=rsv_id
        ).first()

        if not results_before or not results_after:
            return {"error": "Данные за один из периодов не найдены"}

        growth_data = {}
        for comp_field in competencies:
            val_before = getattr(results_before, comp_field, 0) or 0
            val_after = getattr(results_after, comp_field, 0) or 0
            growth = val_after - val_before
            
            growth_data[RsvCompetencies.names.get(comp_field, comp_field)] = {
                "before": val_before,
                "after": val_after,
                "growth": growth,
                "growth_percent": round((growth / val_before * 100) if val_before else 0, 2)
            }

        return {
            "rsv_id": rsv_id,
            "periods": f"{period_before} → {period_after}",
            "competencies": growth_data,
            "summary": {
                "avg_growth": round(
                    sum(d["growth"] for d in growth_data.values()) / len(growth_data), 2
                ),
                "positive_changes": sum(1 for d in growth_data.values() if d["growth"] > 0),
                "negative_changes": sum(1 for d in growth_data.values() if d["growth"] < 0),
            }
        }

    @staticmethod
    def get_demographic_stats(
        institution_id: int = None,
        edu_level_id: int = None,
        gender: str = None,
        group_by: str = "institution"
    ) -> dict:
        filters = Q()
        if institution_id:
            filters &= Q(res_institution_id=institution_id)
        if edu_level_id:
            filters &= Q(res_edu_level_id=edu_level_id)
        if gender:
            filters &= Q(res_participant__part_gender=gender)

        group_field_map = {
            "institution": "res_institution__inst_name",
            "edu_level": "res_edu_level__edu_level_name",
            "gender": "res_participant__part_gender",
            "spec": "res_spec__spec_name",
        }
        group_field = group_field_map.get(group_by, "res_institution__inst_name")

        stats = Results.objects.filter(filters).values(
            group_field
        ).annotate(
            total_students=Count("res_participant", distinct=True),
            avg_competency=Avg(
                ExpressionWrapper(
                    (
                        Coalesce(F("res_comp_info_analysis"), 0) +
                        Coalesce(F("res_comp_planning"), 0) +
                        Coalesce(F("res_comp_result_orientation"), 0) +
                        Coalesce(F("res_comp_stress_resistance"), 0) +
                        Coalesce(F("res_comp_partnership"), 0) +
                        Coalesce(F("res_comp_rules_compliance"), 0) +
                        Coalesce(F("res_comp_self_development"), 0) +
                        Coalesce(F("res_comp_leadership"), 0) +
                        Coalesce(F("res_comp_emotional_intel"), 0) +
                        Coalesce(F("res_comp_client_focus"), 0) +
                        Coalesce(F("res_comp_communication"), 0) +
                        Coalesce(F("res_comp_passive_vocab"), 0)
                    ) / 12.0,
                    output_field=FloatField()
                )
            ),
            # ✅ ИСПРАВЛЕНО: Теперь считаем только по 5 реальным полям из вашей БД
            avg_motivator=Avg(
                ExpressionWrapper(
                    (
                        Coalesce(F("res_mot_autonomy"), 0) +
                        Coalesce(F("res_mot_altruism"), 0) +
                        Coalesce(F("res_mot_challenge"), 0) +
                        Coalesce(F("res_mot_salary"), 0) +
                        Coalesce(F("res_mot_career"), 0)
                    ) / 5.0,
                    output_field=FloatField()
                )
            )
        ).order_by(group_field)

        return {
            "group_by": group_by,
            "filters_applied": {
                "institution_id": institution_id,
                "edu_level_id": edu_level_id,
                "gender": gender,
            },
            "data": list(stats)
        }

    @staticmethod
    def compare_institutions(
        institution_ids: list,
        competency_field: str = None,
        edu_level_id: int = None
    ) -> dict:
        """
        Сравнение средних баллов компетенций между образовательными организациями.
        
        :param institution_ids: Список ID вузов для сравнения
        :param competency_field: Конкретная компетенция для анализа (опционально)
        :param edu_level_id: Фильтр по уровню образования
        :return: dict со сравнительной статистикой
        """
        filters = Q(res_institution_id__in=institution_ids)
        if edu_level_id:
            filters &= Q(res_edu_level_id=edu_level_id)

        # Если указана конкретная компетенция
        if competency_field and hasattr(Results, competency_field):
            stats = Results.objects.filter(filters).values(
                "res_institution__inst_name"
            ).annotate(
                avg_score=Avg(competency_field),
                min_score=Coalesce(F(f"{competency_field}__min"), 0),
                max_score=Coalesce(F(f"{competency_field}__max"), 100),
                students_count=Count("res_participant", distinct=True)
            ).order_by("-avg_score")
            
            return {
                "comparison_type": "single_competency",
                "competency": RsvCompetencies.names.get(competency_field, competency_field),
                "data": list(stats)
            }
        
        # Сравнение по всем компетенциям (средний балл)
        stats = Results.objects.filter(filters).values(
            "res_institution__inst_name"
        ).annotate(
            avg_overall=ExpressionWrapper(
                (
                    Coalesce(F("res_comp_info_analysis"), 0) +
                    Coalesce(F("res_comp_planning"), 0) +
                    Coalesce(F("res_comp_result_orientation"), 0) +
                    Coalesce(F("res_comp_stress_resistance"), 0) +
                    Coalesce(F("res_comp_partnership"), 0) +
                    Coalesce(F("res_comp_rules_compliance"), 0) +
                    Coalesce(F("res_comp_self_development"), 0) +
                    Coalesce(F("res_comp_leadership"), 0) +
                    Coalesce(F("res_comp_emotional_intel"), 0) +
                    Coalesce(F("res_comp_client_focus"), 0) +
                    Coalesce(F("res_comp_communication"), 0) +
                    Coalesce(F("res_comp_passive_vocab"), 0)
                ) / 12.0,
                output_field=FloatField()
            ),
            students_count=Count("res_participant", distinct=True)
        ).order_by("-avg_overall")

        return {
            "comparison_type": "overall_competencies",
            "data": list(stats),
            "ranking": [
                {"rank": i+1, "institution": s["res_institution__inst_name"], "score": round(s["avg_overall"], 2)}
                for i, s in enumerate(stats)
            ]
        }