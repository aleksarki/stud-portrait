import React, { createContext, useState, useContext } from 'react';

const UserContext = createContext(null);
const PagesDataContext = createContext(null);

export function UserProvider({ children }) {
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        isLoggedIn: false
    });
    const loginUser = (data) => setUserData({ ...data, isLoggedIn: true });
    const logoutUser = () => setUserData({ name: '', email: '', isLoggedIn: false });
    return (
        <UserContext.Provider value={{ userData, loginUser, logoutUser }}>
            {children}
        </UserContext.Provider>
    );
}
export const useUser = () => useContext(UserContext);

export function PagesDataProvider({children}) {
    const [savedFilters, setFilters] = useState({});
    const saveFilters = (page, data) => setFilters({...savedFilters, page: data});
    return <PagesDataContext.Provider value={{savedFilters, saveFilters}}>
        {children}
    </PagesDataContext.Provider>;
}
export const usePagesData = () => useContext(PagesDataContext);