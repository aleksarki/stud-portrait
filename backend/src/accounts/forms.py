# accounts/forms.py
from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


class LoginForm(AuthenticationForm):
    """Форма входа с кастомными стилями"""
    username = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Имя пользователя или email',
            'autofocus': True
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Пароль'
        })
    )
    
    # Убедитесь, что этот метод правильно обрабатывает вход
    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')
        
        if username and password:
            # Важно: передаем request в authenticate
            self.user_cache = authenticate(
                self.request,  # <-- Убедитесь, что передается request
                username=username,
                password=password
            )
            
            if self.user_cache is None:
                raise forms.ValidationError(
                    'Неверное имя пользователя или пароль',
                    code='invalid_login'
                )
            else:
                self.confirm_login_allowed(self.user_cache)
        
        return self.cleaned_data


class RegisterForm(UserCreationForm):
    """Форма регистрации"""
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email'
        })
    )
    username = forms.CharField(
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Имя пользователя'
        })
    )
    password1 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Пароль'
        })
    )
    password2 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Подтверждение пароля'
        })
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2']
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise ValidationError('Пользователь с таким email уже существует')
        return email
