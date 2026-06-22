# accounts/views.py
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.models import User
from .forms import LoginForm, RegisterForm
from .models import UserProfile
from portrait.models import Studentmapping, Participants  # Ваши модели
from django.contrib.admin.views.decorators import staff_member_required
from django.middleware.csrf import get_token 
import json

from portrait.models import Studentmapping, Participants


@login_required
def student_not_found_view(request):
    """Страница для студентов без данных"""
    return render(request, 'accounts/student_not_found.html', {
        'user': request.user
    })


def get_redirect_url_by_role(user):
    """Определяет URL для перенаправления на React-страницы"""
    try:
        profile = user.profile
        role = profile.role
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=user, role='student')
        role = 'student'
    
    if role == 'superadmin':
        return '/super/audit'
    elif role == 'admin':
        return '/admin/stats'
    else:  # student
        try:
            student_mapping = Studentmapping.objects.filter(
                mapping_email=user.email
            ).first()
            
            if student_mapping:
                participant = Participants.objects.filter(
                    part_rsv=student_mapping.mapping_rsv
                ).first()
                if participant:
                    return f'/student/{participant.part_id}'
            
            participant = Participants.objects.filter(
                part_rsv=user.username
            ).first()
            if participant:
                return f'/student/{participant.part_id}'
                
        except Exception as e:
            print(f"Error finding student: {e}")
        
        return '/student/not-found'
    
    return '/dashboard'


def get_participant_id(user):
    """Получить participant_id для студента"""
    try:
        if user.profile.role == 'student':
            # Ищем в StudentMapping по email
            student_mapping = Studentmapping.objects.filter(
                mapping_email=user.email
            ).first()
            
            if student_mapping:
                participant = Participants.objects.filter(
                    part_rsv=student_mapping.mapping_rsv
                ).first()
                if participant:
                    return participant.part_id
            
            # Пробуем по username
            participant = Participants.objects.filter(
                part_rsv=user.username
            ).first()
            if participant:
                return participant.part_id
    except:
        pass
    return None


@csrf_protect
def login_view(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'success': True,
            'message': 'Already authenticated',
            'redirect_url': get_redirect_url_by_role(request.user),
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'role': request.user.profile.role,
                'participant_id': get_participant_id(request.user)
            }
        })
    
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            
            # Получаем роль
            try:
                role = user.profile.role
            except:
                role = 'student'
            
            response_data = {
                'success': True,
                'message': f'Добро пожаловать, {user.username}!',
                'redirect_url': get_redirect_url_by_role(user),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': role,
                    'participant_id': get_participant_id(user)
                }
            }
            return JsonResponse(response_data)
        else:
            return JsonResponse({
                'success': False,
                'error': 'Неверное имя пользователя или пароль'
            }, status=400)
    else:
        form = LoginForm(request)
    
    if not request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'accounts/login.html', {'form': form})
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


def register_view(request):
    """Представление для регистрации"""
    if request.user.is_authenticated:
        return redirect(get_redirect_url_by_role(request.user))
    
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            
            # Устанавливаем роль по умолчанию - student
            profile = user.profile
            profile.role = 'student'
            profile.save()
            
            # Автоматический вход после регистрации
            login(request, user)
            messages.success(request, 'Регистрация успешно завершена!')
            
            # Перенаправление на страницу студента (или на поиск студента)
            return redirect(get_redirect_url_by_role(user))
        else:
            messages.error(request, 'Пожалуйста, исправьте ошибки в форме')
    else:
        form = RegisterForm()
    
    return render(request, 'accounts/register.html', {'form': form})


@login_required
def logout_view(request):
    """Представление для выхода"""
    logout(request)
    messages.info(request, 'Вы вышли из системы')
    return redirect('login')


@login_required
def dashboard_view(request):
    """Главная страница после входа (fallback)"""
    return render(request, 'accounts/dashboard.html', {
        'user': request.user,
        'redirect_url': get_redirect_url_by_role(request.user)
    })


@login_required
def profile_view(request):
    """Профиль пользователя"""
    return render(request, 'accounts/profile.html', {
        'user': request.user
    })


@staff_member_required
def assign_role_view(request):
    """Назначение роли пользователю (только для админов)"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            role = data.get('role')
            
            if not user_id or not role:
                return JsonResponse({'error': 'Missing parameters'}, status=400)
            
            user = User.objects.get(id=user_id)
            profile = user.profile
            profile.role = role
            profile.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Role for {user.username} set to {role}'
            })
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@staff_member_required
def get_users_list_view(request):
    """Получение списка пользователей с ролями"""
    users = User.objects.all().select_related('profile')
    data = [{
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.profile.role if hasattr(user, 'profile') else 'student',
        'is_active': user.is_active,
        'date_joined': user.date_joined.strftime('%Y-%m-%d %H:%M:%S')
    } for user in users]
    
    return JsonResponse({'users': data})


@login_required
def current_user_info(request):
    """Получение информации о текущем пользователе для фронтенда"""
    user = request.user
    try:
        profile = user.profile
        role = profile.role
    except UserProfile.DoesNotExist:
        role = 'student'
    
    # Находим participant_id если студент
    participant_id = None
    student_data = None
    
    if role == 'student':
        try:
            # Ищем в StudentMapping по email
            student_mapping = Studentmapping.objects.filter(
                mapping_email=user.email
            ).first()
            
            if student_mapping:
                participant = Participants.objects.filter(
                    part_rsv=student_mapping.mapping_rsv
                ).first()
                if participant:
                    participant_id = participant.part_id
                    student_data = {
                        'id': participant.part_id,
                        'rsv': participant.part_rsv,
                        'course_num': participant.part_course_num,
                        'gender': participant.part_gender,
                        'name': student_mapping.mapping_stud_name,
                        'email': student_mapping.mapping_email,
                    }
            
            # Если не нашли по email, пробуем по username
            if not participant_id:
                participant = Participants.objects.filter(
                    part_rsv=user.username
                ).first()
                if participant:
                    participant_id = participant.part_id
                    student_data = {
                        'id': participant.part_id,
                        'rsv': participant.part_rsv,
                        'course_num': participant.part_course_num,
                        'gender': participant.part_gender,
                    }
                    
        except Exception as e:
            print(f"Error getting student data: {e}")
    
    return JsonResponse({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': role,
        'participant_id': participant_id,
        'student_data': student_data,
        'is_authenticated': True,
        'redirect_url': get_redirect_url_by_role(user)
    })


@login_required
def check_auth_view(request):
    """Проверка авторизации для React"""
    user = request.user
    try:
        profile = user.profile
        role = profile.role
    except UserProfile.DoesNotExist:
        role = 'student'
    
    return JsonResponse({
        'authenticated': True,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': role,
            'participant_id': get_participant_id(user)
        },
        'redirect_url': get_redirect_url_by_role(user)
    })


def csrf_token_view(request):
    """Получение CSRF токена для React"""
    return JsonResponse({'csrfToken': get_token(request)})


@login_required
def logout_view(request):
    """Представление для выхода"""
    logout(request)
    return JsonResponse({
        'success': True,
        'message': 'Вы вышли из системы',
        'redirect_url': '/login'
    })
