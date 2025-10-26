from django.db import models

# Create your models here.

class Students(models.Model):
    stud_id = models.AutoField(primary_key=True)
    stud_name = models.CharField(max_length=512)
    stud_enter_year = models.IntegerField()
    stud_major = models.CharField(max_length=512)
    stud_edu_instit = models.CharField(max_length=512)
    
    class Meta:
        managed = False
        db_table = 'students'
    
    def __str__(self):
        return self.stud_name

class Results(models.Model):
    res_id = models.AutoField(primary_key=True)
    res_stud = models.ForeignKey(Students, on_delete=models.CASCADE, db_column='res_stud')
    res_year = models.IntegerField()
    
    # Универсальный личностный опросник
    res_uni_communication = models.IntegerField(null=True, blank=True)
    res_uni_complex_thinking = models.IntegerField(null=True, blank=True)
    res_uni_command_work = models.IntegerField(null=True, blank=True)
    res_uni_methodicalness = models.IntegerField(null=True, blank=True)
    res_uni_stress_susceptib = models.IntegerField(null=True, blank=True)
    res_uni_ambitousness = models.IntegerField(null=True, blank=True)
    res_uni_rules_compliance = models.IntegerField(null=True, blank=True)
    
    # Мотивационно-ценностный профиль
    res_mot_purpose = models.IntegerField(null=True, blank=True)
    res_mot_cooperation = models.IntegerField(null=True, blank=True)
    res_mot_creativity = models.IntegerField(null=True, blank=True)
    res_mot_challenge = models.IntegerField(null=True, blank=True)
    res_mot_autonomy = models.IntegerField(null=True, blank=True)
    res_mot_self_development = models.IntegerField(null=True, blank=True)
    res_mot_recognition = models.IntegerField(null=True, blank=True)
    res_mot_career = models.IntegerField(null=True, blank=True)
    res_mot_management = models.IntegerField(null=True, blank=True)
    res_mot_altruism = models.IntegerField(null=True, blank=True)
    res_mot_relationships = models.IntegerField(null=True, blank=True)
    res_mot_affiliation = models.IntegerField(null=True, blank=True)
    res_mot_tradition = models.IntegerField(null=True, blank=True)
    res_mot_health = models.IntegerField(null=True, blank=True)
    res_mot_stability = models.IntegerField(null=True, blank=True)
    res_mot_salary = models.IntegerField(null=True, blank=True)
    
    # Компетенции
    res_comp_digital_analysis = models.IntegerField(null=True, blank=True)
    res_comp_verbal_analysis = models.IntegerField(null=True, blank=True)
    
    # Жизнестойкость
    res_vita_positive_self_attit = models.IntegerField(null=True, blank=True)
    res_vita_attit_twrd_future = models.IntegerField(null=True, blank=True)
    res_vita_organization = models.IntegerField(null=True, blank=True)
    res_vita_persistence = models.IntegerField(null=True, blank=True)
    
    # Ценностные установки лидера
    res_lead_awareness = models.IntegerField(null=True, blank=True)
    res_lead_proactivity = models.IntegerField(null=True, blank=True)
    res_lead_command_work = models.IntegerField(null=True, blank=True)
    res_lead_control = models.IntegerField(null=True, blank=True)
    res_lead_social_responsib = models.IntegerField(null=True, blank=True)
    
    # Индивидуальный профиль
    res_prof_information_analysis = models.IntegerField(null=True, blank=True)
    res_prof_result_orientation = models.IntegerField(null=True, blank=True)
    res_prof_planning = models.IntegerField(null=True, blank=True)
    res_prof_stress_resistance = models.IntegerField(null=True, blank=True)
    res_prof_partnership = models.IntegerField(null=True, blank=True)
    res_prof_rules_compliance = models.IntegerField(null=True, blank=True)
    res_prof_self_development = models.IntegerField(null=True, blank=True)
    res_prof_communication = models.IntegerField(null=True, blank=True)
    
    class Meta:
        managed = False
        db_table = 'results'
    
    def __str__(self):
        return f"Results of {self.res_stud.stud_name} of year {self.res_year}"
