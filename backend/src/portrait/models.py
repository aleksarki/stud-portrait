from django.db import models

# Create your models here.

class Students(models.Model):
    stud_name = models.CharField(max_length=512)

class Results(models.Model):
    res_stud = models.ForeignKey(Students, on_delete=models.CASCADE)
    res_year = models.IntegerField(null=False)
    