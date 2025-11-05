# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class CompetenceCenters(models.Model):
    center_id = models.AutoField(primary_key=True)
    center_name = models.CharField(max_length=512)

    class Meta:
        managed = False
        db_table = 'competencecenters'


class Courses(models.Model):
    course_id = models.AutoField(primary_key=True)
    course_name = models.CharField(max_length=512)

    class Meta:
        managed = False
        db_table = 'courses'


class EducationLevels(models.Model):
    edu_level_id = models.AutoField(primary_key=True)
    edu_level_name = models.CharField(max_length=256, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'educationlevels'


class Institutions(models.Model):
    inst_id = models.AutoField(primary_key=True)
    inst_name = models.CharField(max_length=512, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'institutions'


class ParticipantCourses(models.Model):
    pc_id = models.AutoField(primary_key=True)
    pc_participant = models.ForeignKey('Participants', models.DO_NOTHING, db_column='pc_participant')
    pc_course = models.ForeignKey(Courses, models.DO_NOTHING, db_column='pc_course', blank=True, null=True)
    pc_result = models.ForeignKey('Results', models.DO_NOTHING, db_column='pc_result', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'participantcourses'
        unique_together = (('pc_participant', 'pc_course'),)


class Participants(models.Model):
    part_id = models.AutoField(primary_key=True)
    part_name = models.CharField(max_length=512)
    part_gender = models.CharField(max_length=16, blank=True, null=True)
    part_institution = models.ForeignKey(Institutions, models.DO_NOTHING, db_column='part_institution', blank=True, null=True)
    part_spec = models.ForeignKey('Specialties', models.DO_NOTHING, db_column='part_spec', blank=True, null=True)
    part_edu_level = models.ForeignKey(EducationLevels, models.DO_NOTHING, db_column='part_edu_level', blank=True, null=True)
    part_form = models.ForeignKey('Studyforms', models.DO_NOTHING, db_column='part_form', blank=True, null=True)
    part_course_num = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'participants'


class Results(models.Model):
    res_id = models.AutoField(primary_key=True)
    res_participant = models.ForeignKey(Participants, models.DO_NOTHING, db_column='res_participant')
    res_center = models.ForeignKey(CompetenceCenters, models.DO_NOTHING, db_column='res_center')
    res_institution = models.ForeignKey(Institutions, models.DO_NOTHING, db_column='res_institution', blank=True, null=True)
    res_edu_level = models.ForeignKey(EducationLevels, models.DO_NOTHING, db_column='res_edu_level', blank=True, null=True)
    res_form = models.ForeignKey('Studyforms', models.DO_NOTHING, db_column='res_form', blank=True, null=True)
    res_spec = models.ForeignKey('Specialties', models.DO_NOTHING, db_column='res_spec', blank=True, null=True)
    res_course_num = models.IntegerField(blank=True, null=True)
    res_year = models.IntegerField()
    res_high_potential = models.TextField(blank=True, null=True)
    res_summary_report = models.TextField(blank=True, null=True)
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
    res_mot_autonomy = models.IntegerField(blank=True, null=True)
    res_mot_altruism = models.IntegerField(blank=True, null=True)
    res_mot_challenge = models.IntegerField(blank=True, null=True)
    res_mot_salary = models.IntegerField(blank=True, null=True)
    res_mot_career = models.IntegerField(blank=True, null=True)
    res_mot_creativity = models.IntegerField(blank=True, null=True)
    res_mot_relationships = models.IntegerField(blank=True, null=True)
    res_mot_recognition = models.IntegerField(blank=True, null=True)
    res_mot_affiliation = models.IntegerField(blank=True, null=True)
    res_mot_self_development = models.IntegerField(blank=True, null=True)
    res_mot_purpose = models.IntegerField(blank=True, null=True)
    res_mot_cooperation = models.IntegerField(blank=True, null=True)
    res_mot_stability = models.IntegerField(blank=True, null=True)
    res_mot_tradition = models.IntegerField(blank=True, null=True)
    res_mot_management = models.IntegerField(blank=True, null=True)
    res_mot_work_conditions = models.IntegerField(blank=True, null=True)
    res_val_honesty_justice = models.IntegerField(blank=True, null=True)
    res_val_humanism = models.IntegerField(blank=True, null=True)
    res_val_patriotism = models.IntegerField(blank=True, null=True)
    res_val_family = models.IntegerField(blank=True, null=True)
    res_val_health = models.IntegerField(blank=True, null=True)
    res_val_environment = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'results'


class Specialties(models.Model):
    spec_id = models.AutoField(primary_key=True)
    spec_name = models.CharField(max_length=512, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'specialties'


class StudyForms(models.Model):
    form_id = models.AutoField(primary_key=True)
    form_name = models.CharField(max_length=256, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'studyforms'
