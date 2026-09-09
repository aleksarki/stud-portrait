import React from 'react';

import Dropdown from './ui/Dropdown';
import logo from '../static/logo_white.png';

import './SidebarLayout.scss';

import { useLocation } from 'react-router-dom';
import ToggleLeft from '@icons/toggle_left.png';
import ToggleRight from '@icons/toggle_right.png';

export const LAYOUT_STYLE = {
    ADMIN: 'admin',
    MODEUS: 'modeus',
    NORMAL: 'normal'
};

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

export function Header({ title, name }) {
    return (
        <div className="Header">
            <div className="left-side">
                <div className="logo-area">
                    <img
                        src={logo}
                        height="55"
                        alt="Тюменский государственный университет"
                    />
                    <span className="logo-title">StudPortrait</span>
                </div>
                <span className="title">{title}</span>
            </div>
            <div className="right-side">
                <Dropdown label={name}>
                    <span style={{ cursor: 'not-allowed' }}>Выход</span>
                </Dropdown>
            </div>
        </div>
    );
}

export function Sidebar({ links, linkTree }) {
    const [isOpen, setIsOpen] = React.useState(true);
    const location = useLocation();
    if (isOpen) {
        if (linkTree) {
            return (
                <div className="Sidebar-container">
                    <nav className="Sidebar">
                        <ul>
                            {linkTree.map((category, index) => (
                                <li key={index}>
                                    {category.category && <span>{category.category}</span>}
                                    <ul>
                                        {category.links.map((link, index) => (
                                            <li key={index}>
                                                <a
                                                    href={link.to}
                                                    className={link.to === location.pathname ? 'Sidebar-item-active' : 'Sidebar-item'}
                                                >
                                                    {link.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className="SideBar-btn-container">
                        <img
                            src={ToggleLeft}
                            onClick={() => setIsOpen(false)}
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className="Sidebar-container">
                <nav className="Sidebar">
                    <ul>
                        {links?.map?.((link, index) => (
                            <li key={index}>
                                <a
                                    href={link.to}
                                    className={link.to === location.pathname ? 'Sidebar-item-active' : 'Sidebar-item'}
                                >
                                    {link.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="SideBar-btn-container">
                    <img
                        src={ToggleLeft}
                        onClick={() => setIsOpen(false)}
                    />
                </div>
            </div>
        );
    } else {
        return (
            <div
                className="Sidebar-container"
                style={{ width: '30px' }}
            >
                <nav className="Sidebar-closed"></nav>
                <div className="SideBar-btn-container">
                    <img
                        src={ToggleRight}
                        onClick={() => setIsOpen(true)}
                    />
                </div>
            </div>
        );
    }
}

export function Content({ children }) {
    return <div className="Content">{children}</div>;
}
