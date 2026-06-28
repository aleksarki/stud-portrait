# accounts/management/commands/assign_roles.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import UserProfile


class Command(BaseCommand):
    help = 'Assign roles to users'

    def handle(self, *args, **options):
        # Назначаем superadmin всем is_superuser
        for user in User.objects.filter(is_superuser=True):
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.role = 'superadmin'
            profile.save()
            self.stdout.write(self.style.SUCCESS(f'Set superadmin role for {user.username}'))

        # Назначаем admin всем is_staff (но не superuser)
        for user in User.objects.filter(is_staff=True, is_superuser=False):
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.role = 'admin'
            profile.save()
            self.stdout.write(self.style.SUCCESS(f'Set admin role for {user.username}'))

        self.stdout.write(self.style.SUCCESS('Roles assigned successfully'))
