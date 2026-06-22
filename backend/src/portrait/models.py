# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Academicperformances(models.Model):
    perf_id = models.AutoField(primary_key=True)
    perf_participant = models.ForeignKey('Participants', models.DO_NOTHING, db_column='perf_participant')
    perf_edu_discipline = models.ForeignKey('Educationdisciplines', models.DO_NOTHING, db_column='perf_edu_discipline')
    perf_year = models.CharField(max_length=16)
    perf_current = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    perf_digital = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    perf_main = models.IntegerField(blank=True, null=True)
    perf_first_retake = models.IntegerField(blank=True, null=True)
    perf_second_retake = models.IntegerField(blank=True, null=True)
    perf_grade_retake = models.IntegerField(blank=True, null=True)
    perf_final = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'academicperformances'
        unique_together = (('perf_participant', 'perf_year', 'perf_edu_discipline'),)


class Competencecenters(models.Model):
    center_id = models.AutoField(primary_key=True)
    center_name = models.TextField()

    class Meta:
        managed = False
        db_table = 'competencecenters'


class Courseresults(models.Model):
    course_id = models.AutoField(primary_key=True)
    course_participant = models.ForeignKey('Participants', models.DO_NOTHING, db_column='course_participant')
    course_an_dec = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_client_focus = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_communication = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_leadership = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_result_orientation = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_planning_org = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_rules_culture = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_self_dev = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_collaboration = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_stress_resistance = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_emotions_communication = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_negotiations = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_digital_comm = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_effective_learning = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_entrepreneurship = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_creativity_tech = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_trendwatching = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_conflict_management = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_career_management = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_burnout = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_cross_cultural_comm = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    course_mentoring = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'courseresults'


class Datauploadtemplate(models.Model):
    template_id = models.AutoField(primary_key=True)
    template_name = models.CharField(unique=True, max_length=256)
    template_description = models.TextField(blank=True, null=True)
    template_config = models.JSONField()  # This field type is a guess. // Switched to JSONField manually
    template_created_at = models.DateTimeField(blank=True, null=True)
    template_updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'datauploadtemplate'


class Educationdisciplines(models.Model):
    edu_disc_id = models.AutoField(primary_key=True)
    edu_disc_name = models.CharField(max_length=1024)

    class Meta:
        managed = False
        db_table = 'educationdisciplines'


class Educationforms(models.Model):
    edu_form_id = models.AutoField(primary_key=True)
    edu_form_name = models.CharField(max_length=64)

    class Meta:
        managed = False
        db_table = 'educationforms'


class Educationlevels(models.Model):
    edu_level_id = models.AutoField(primary_key=True)
    edu_level_name = models.CharField(max_length=512)

    class Meta:
        managed = False
        db_table = 'educationlevels'


class Educationspecialties(models.Model):
    edu_spec_id = models.AutoField(primary_key=True)
    edu_spec_name = models.CharField(max_length=1024)

    class Meta:
        managed = False
        db_table = 'educationspecialties'


class Institutions(models.Model):
    inst_id = models.AutoField(primary_key=True)
    inst_name = models.TextField()

    class Meta:
        managed = False
        db_table = 'institutions'


class Participants(models.Model):
    part_id = models.AutoField(primary_key=True)
    part_rsv = models.CharField(unique=True, max_length=512)
    part_course_num = models.IntegerField(blank=True, null=True)
    part_gender = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'participants'


class Studentmapping(models.Model):
    mapping_id = models.AutoField(primary_key=True)
    mapping_rsv = models.CharField(unique=True, max_length=512)
    mapping_stud_name = models.CharField(max_length=512)
    mapping_stud_gender = models.IntegerField(blank=True, null=True)
    mapping_email = models.CharField(max_length=256, blank=True, null=True)
    mapping_created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'studentmapping'


class Testresults(models.Model):
    res_id = models.AutoField(primary_key=True)
    res_participant = models.ForeignKey(Participants, models.DO_NOTHING, db_column='res_participant')
    res_center = models.ForeignKey(Competencecenters, models.DO_NOTHING, db_column='res_center')
    res_institution = models.ForeignKey(Institutions, models.DO_NOTHING, db_column='res_institution', blank=True, null=True)
    res_edu_level = models.ForeignKey(Educationlevels, models.DO_NOTHING, db_column='res_edu_level', blank=True, null=True)
    res_edu_form = models.ForeignKey(Educationforms, models.DO_NOTHING, db_column='res_edu_form', blank=True, null=True)
    res_edu_specialty = models.ForeignKey(Educationspecialties, models.DO_NOTHING, db_column='res_edu_specialty', blank=True, null=True)
    res_course = models.IntegerField(blank=True, null=True)
    res_year = models.CharField(max_length=16)
    res_potential = models.IntegerField(blank=True, null=True)
    res_report = models.CharField(max_length=1024, blank=True, null=True)
    res_comp_info_analysis = models.IntegerField(blank=True, null=True)
    res_comp_planning = models.IntegerField(blank=True, null=True)
    res_comp_result_orientation = models.IntegerField(blank=True, null=True)
    res_comp_stress_resistance = models.IntegerField(blank=True, null=True)
    res_comp_partnership = models.IntegerField(blank=True, null=True)
    res_comp_rules_compliance = models.IntegerField(blank=True, null=True)
    res_comp_self_development = models.IntegerField(blank=True, null=True)
    res_comp_leadership = models.IntegerField(blank=True, null=True)
    res_comp_emotional_intel = models.IntegerField(blank=True, null=True)
    res_comp_client_focus = models.IntegerField(blank=True, null=True)
    res_comp_communication = models.IntegerField(blank=True, null=True)
    res_comp_passive_vocab = models.IntegerField(blank=True, null=True)
    res_mot_autonomy = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_altruism = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_challenge = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_salary = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_career = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_creativity = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_relationships = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_recognition = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_affiliation = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_self_development = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_purpose = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_cooperation = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_stability = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_tradition = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_management = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_mot_work_conditions = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    res_val_honesty_justice = models.IntegerField(blank=True, null=True)
    res_val_humanism = models.IntegerField(blank=True, null=True)
    res_val_patriotism = models.IntegerField(blank=True, null=True)
    res_val_family = models.IntegerField(blank=True, null=True)
    res_val_health = models.IntegerField(blank=True, null=True)
    res_val_environment = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'testresults'
        unique_together = (('res_participant', 'res_year'),)

class DisciplineCompetencyMapping(models.Model):
    """
    Хранит результат парсинга учебного плана ТюмГУ:
    дисциплина → список РСВ-компетенций (res_comp_*).
 
    Заполняется через эндпоинт POST /portrait/parse-curriculum/.
    Используется вместо захардкоженного DISCIPLINE_COMPETENCY_MAP
    в analysis_end.py.
    """
    disc_name = models.CharField(
        max_length=1024,
        unique=True,
        db_index=True,
        verbose_name="Название дисциплины",
    )
    # ['res_comp_leadership', 'res_comp_planning', …]
    rsv_competencies = models.JSONField(
        default=list,
        verbose_name="РСВ-компетенции (res_comp_*)",
    )
    # ['УК-1', 'УК-3', 'ОПК-2', …]
    standard_competencies = models.JSONField(
        default=list,
        verbose_name="Стандартные компетенции ФГОС",
    )
    semester = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="Семестр",
    )
    parsed_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата последнего парсинга",
    )
 
    class Meta:
        # managed = True  ← Django создаёт таблицу при миграции
        db_table = "discipline_competency_mapping"
        verbose_name = "Маппинг дисциплин → компетенции"
        verbose_name_plural = "Маппинг дисциплин → компетенции"
 
    def __str__(self) -> str:
        return f"{self.disc_name} → {self.rsv_competencies}"
 
 
class CurriculumParseLog(models.Model):
    """
    Журнал запусков парсера учебного плана.
    Отображается суперадмину в UI.
    """
    STATUS_RUNNING = "running"
    STATUS_SUCCESS = "success"
    STATUS_ERROR   = "error"
    STATUS_CHOICES = [
        (STATUS_RUNNING, "Выполняется"),
        (STATUS_SUCCESS, "Успешно"),
        (STATUS_ERROR,   "Ошибка"),
    ]
 
    started_at         = models.DateTimeField(auto_now_add=True)
    finished_at        = models.DateTimeField(null=True, blank=True)
    status             = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_RUNNING)
    disciplines_found  = models.IntegerField(default=0)
    disciplines_saved  = models.IntegerField(default=0)
    source_url         = models.URLField(max_length=512, blank=True)
    error_message      = models.TextField(blank=True)
 
    class Meta:
        db_table = "curriculum_parse_log"
        ordering = ["-started_at"]
        verbose_name = "Лог парсинга учебного плана"
        verbose_name_plural = "Логи парсинга учебного плана"
 
    def __str__(self) -> str:
        return f"[{self.status}] {self.started_at:%Y-%m-%d %H:%M}"