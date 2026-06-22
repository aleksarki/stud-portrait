# accounts/models.py
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """Профиль пользователя с ролями"""
    
    ROLE_CHOICES = [
        ('student', 'Студент'),
        ('admin', 'Администратор'),
        ('superadmin', 'Супер-администратор'),
    ]
    
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='profile'
    )
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='student'
    )
    
    # Связь с вашими данными - используем строку с указанием приложения
    participant = models.ForeignKey(
        'portrait.Participants',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_profiles'
    )
    
    # Дополнительные поля
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"
    
    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'Профиль пользователя'
        verbose_name_plural = 'Профили пользователей'


# Автоматическое создание профиля при создании пользователя
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
