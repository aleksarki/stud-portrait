// SidebarLayout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import Dropdown from "./ui/Dropdown";
import logo from "../static/logo_white.png";

import "./SidebarLayout.scss";

export const LAYOUT_STYLE = {
    ADMIN: "admin",
    MODEUS: "modeus",
    NORMAL: "normal"
};

// Настройка axios
axios.defaults.withCredentials = true;
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.xsrfCookieName = 'csrftoken';

export function SidebarLayout({ children, style = LAYOUT_STYLE.NORMAL }) {
    const arr = React.Children.toArray(children);

    return (
        <div className={`SidebarLayout style--${style}`}>
            {arr.find(child => child.type === Header)}
            {arr.find(child => child.type === Sidebar)}
            {arr.find(child => child.type === Content)}
        </div>
    );
}

export function Header({ title, name, showLogout = true }) {
    const navigate = useNavigate();
    const [userName, setUserName] = useState(name || 'Пользователь');
    const [userRole, setUserRole] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Получаем данные пользователя из localStorage или с сервера
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setUserName(user.username || name || 'Пользователь');
                setUserRole(user.role || '');
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
    }, [name]);

    const handleLogout = async () => {
        if (loading) return;
        
        setLoading(true);
        try {
            // Получаем CSRF токен
            const csrfResponse = await axios.get('http://localhost:8000/accounts/api/csrf-token/');
            const csrfToken = csrfResponse.data.csrfToken;

            // Отправляем запрос на выход
            await axios.post(
                'http://localhost:8000/accounts/api/logout/',
                {},
                {
                    headers: {
                        'X-CSRFToken': csrfToken,
                    },
                }
            );

            // Очищаем localStorage
            localStorage.removeItem('user');
            
            // Перенаправляем на страницу входа
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            // Даже если ошибка, очищаем localStorage и перенаправляем
            localStorage.removeItem('user');
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    // Определяем роль для отображения
    const getRoleDisplay = () => {
        const roleMap = {
            'superadmin': 'Суперадмин',
            'admin': 'Администратор',
            'student': 'Студент'
        };
        return roleMap[userRole] || '';
    };

    return (
        <div className="Header">
            <div className="left-side">
                <div className="logo-area">
                    <img src={logo} height="55" alt="Тюменский государственный университет" />
                    <span className="logo-title">StudPortrait</span>
                </div>
                <span className="title">{title}</span>
            </div>
            <div className="right-side">
                <Dropdown 
                    label={
                        <div className="user-info">
                            <span className="user-name">{userName}</span>
                            {userRole && (
                                <span className="user-role-badge">{getRoleDisplay()}</span>
                            )}
                        </div>
                    }
                >
                    <div className="dropdown-menu-items">
                        <div className="dropdown-user-info">
                            <div className="dropdown-username">{userName}</div>
                            {userRole && (
                                <div className="dropdown-user-role">{getRoleDisplay()}</div>
                            )}
                        </div>
                        <div className="dropdown-divider"></div>
                        <button 
                            className="dropdown-item logout-btn"
                            onClick={handleLogout}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Выход...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sign-out-alt"></i> Выход
                                </>
                            )}
                        </button>
                    </div>
                </Dropdown>
            </div>
        </div>
    );
}

export function Sidebar({ links, linkTree }) {
    if (linkTree) {
        return (
            <nav className="Sidebar">
                <ul>
                    {linkTree.map((category, index) => (
                        <li key={index}>
                            {category.category && <span>{category.category}</span>}
                            <ul>
                                {category.links.map((link, index1) => (
                                    <li key={index1}>
                                        <a href={link.to}>{link.title}</a>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            </nav>
        );
    }

    return (
        <nav className="Sidebar">
            <ul>
                {links?.map?.((link, index) => (
                    <li key={index}>
                        <a href={link.to}>{link.title}</a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export function Content({ children }) {
    return (
        <div className="Content">
            {children}
        </div>
    );
}
