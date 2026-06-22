# accounts/management/commands/assign_roles.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import UserProfile


class Command(BaseCommand):
    help = 'Assign roles to users'

    def handle(self, *args, **options):
        # Назначаем суперадмина
        admin_user = User.objects.filter(username='admin').first()
        if admin_user:
            profile, created = UserProfile.objects.get_or_create(user=admin_user)
            profile.role = 'superadmin'
            profile.save()
            self.stdout.write(self.style.SUCCESS(f'Set superadmin role for {admin_user.username}'))
        
        # Можно также назначить админов
        # admin_users = User.objects.filter(is_staff=True)
        # for user in admin_users:
        #     profile, created = UserProfile.objects.get_or_create(user=user)
        #     profile.role = 'admin'
        #     profile.save()
        
        self.stdout.write(self.style.SUCCESS('Roles assigned successfully'))
