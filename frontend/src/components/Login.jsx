// src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

axios.defaults.withCredentials = true;
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.xsrfCookieName = 'csrftoken';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Проверяем, есть ли пользователь в localStorage
        const userData = localStorage.getItem('user');
        console.log('Login page - checking localStorage:', userData);
        
        if (userData) {
            try {
                const user = JSON.parse(userData);
                console.log('User found in localStorage:', user);
                
                // Перенаправляем на основе роли
                const redirectMap = {
                    'superadmin': '/super/audit',
                    'admin': '/admin/stats',
                    'student': `/student/${user.participant_id || 'not-found'}`
                };
                navigate(redirectMap[user.role] || '/login');
            } catch (e) {
                console.error('Error parsing user data:', e);
                localStorage.removeItem('user');
            }
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        console.log('Attempting login with:', username);

        try {
            // Получаем CSRF токен
            const csrfResponse = await axios.get('http://localhost:8000/accounts/api/csrf-token/');
            const csrfToken = csrfResponse.data.csrfToken;
            console.log('CSRF token received');

            // Создаем FormData
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await axios.post(
                'http://localhost:8000/accounts/api/login/',
                formData.toString(),
                {
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            console.log('Login response:', response.data);

            if (response.data.success) {
                // Сохраняем пользователя в localStorage
                const userData = response.data.user;
                console.log('Saving user data:', userData);
                
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Проверяем, что сохранилось
                const savedData = localStorage.getItem('user');
                console.log('Saved data in localStorage:', savedData);
                
                // Перенаправляем
                const redirectUrl = response.data.redirect_url;
                console.log('Redirecting to:', redirectUrl);
                navigate(redirectUrl);
            } else {
                setError(response.data.error || 'Ошибка входа');
            }
        } catch (error) {
            console.error('Login error:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
                setError(error.response.data?.error || 'Ошибка сервера');
            } else {
                setError('Ошибка подключения к серверу');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Вход в систему</h2>
                
                {error && (
                    <div className="alert alert-danger">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Имя пользователя</label>
                        <input
                            type="text"
                            className="form-control"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Введите имя пользователя"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Пароль</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Введите пароль"
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        className="btn btn-primary w-100"
                        disabled={loading}
                    >
                        {loading ? 'Вход...' : 'Войти'}
                    </button>
                </form>
                
                <div className="register-link">
                    Нет аккаунта? <a href="/register">Зарегистрироваться</a>
                </div>
            </div>
            
            <style>{`
                .login-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                }
                
                .login-card {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 400px;
                    width: 100%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                }
                
                .login-card h2 {
                    text-align: center;
                    color: #333;
                    margin-bottom: 30px;
                }
                
                .form-group {
                    margin-bottom: 20px;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                    color: #555;
                }
                
                .form-control {
                    width: 100%;
                    padding: 10px 15px;
                    border: 2px solid #e1e5eb;
                    border-radius: 10px;
                    font-size: 14px;
                    transition: border-color 0.3s;
                }
                
                .form-control:focus {
                    border-color: #764ba2;
                    outline: none;
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 12px;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
                }
                
                .btn-primary:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                
                .alert {
                    padding: 12px 15px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                }
                
                .alert-danger {
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    color: #721c24;
                }
                
                .register-link {
                    text-align: center;
                    margin-top: 20px;
                    color: #6c757d;
                }
                
                .register-link a {
                    color: #764ba2;
                    text-decoration: none;
                    font-weight: 600;
                }
                
                .register-link a:hover {
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
};

export default Login;
