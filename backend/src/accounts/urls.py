# accounts/urls.py
from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # HTML страницы
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('profile/', views.profile_view, name='profile'),
    path('student-not-found/', views.student_not_found_view, name='student_not_found'),

    # API для React
    path('api/login/', views.login_view, name='api_login'),
    path('api/logout/', views.logout_view, name='api_logout'),
    path('api/check-auth/', views.check_auth_view, name='check_auth'),
    path('api/csrf-token/', views.csrf_token_view, name='csrf_token'),
    path('api/current-user/', views.current_user_info, name='current_user_info'),
    path('api/users/', views.get_users_list_view, name='users_list'),
    path('api/assign-role/', views.assign_role_view, name='assign_role'),
]
