import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

axios.defaults.withCredentials = true;

const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Сначала проверяем localStorage
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setLoading(false);
                    return;
                }

                // Если в localStorage нет, проверяем на сервере
                const response = await axios.get('http://localhost:8000/accounts/api/check-auth/', {
                    withCredentials: true
                });

                if (response.data.authenticated) {
                    const userData = response.data.user;
                    localStorage.setItem('user', JSON.stringify(userData));
                    setUser(userData);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('Auth check error:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const logout = async () => {
        try {
            await axios.post('http://localhost:8000/accounts/api/logout/', {}, {
                withCredentials: true
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('user');
            setUser(null);
            navigate('/login');
        }
    };

    return { user, loading, logout };
};

export default useAuth;
