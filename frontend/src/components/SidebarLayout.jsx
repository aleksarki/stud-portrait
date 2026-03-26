import React from "react";

import Dropdown from "./ui/Dropdown";
import logo from "../static/logo_white.png";

import "./SidebarLayout.scss";

export const LAYOUT_STYLE = {
    ADMIN:  "admin",
    MODEUS: "modeus",
    NORMAL: "normal"
};

export function SidebarLayout({ children, style = LAYOUT_STYLE.NORMAL }) {
    const arr = React.Children.toArray(children);

    return (
        <div className={`SidebarLayout style--${style}`} >
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
                    <img src={logo} height="55" alt="Тюменский государственный университет" />
                    <span className="logo-title">StudPortrait</span>
                </div>
                <span className="title">{title}</span>
            </div>
            <div className="right-side">
                <Dropdown handle={<span className="menu-handle">{name}</span>}>
                    <span style={{cursor: "pointer"}}>Выход</span>
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
