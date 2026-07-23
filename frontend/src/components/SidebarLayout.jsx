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
                <Dropdown label={name}>
                    <span style={{cursor: "not-allowed"}}>Выход</span>
                </Dropdown>
            </div>
        </div>
    );
}


export function Sidebar({ links, linkTree }) {
    const [isOpen, setIsOpen] = React.useState(true);
    const [currentPage, setCurrentPage] = React.useState(0);
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
                                    {category.links.map((link, index1) => (
                                        <li key={index} className={currentPage === index1 ? "Sidebar-item-active" : "Sidebar-item"}>
                                            <a href={link.to} onClick={(index1) => setCurrentPage(index1)}>{link.title}</a>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </nav>
                    <div className="SideBar-btn-container">
                        <button onClick={() => setIsOpen(false)}>{"<"}</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="Sidebar-container">
            <nav className="Sidebar">
                <ul>
                    {links?.map?.((link, index) => (
                        <li key={index} className={currentPage === index ? "Sidebar-item-active" : "Sidebar-item"}>
                            <a href={link.to} onClick={(index) => setCurrentPage(index)}>{link.title}</a>
                        </li>
                    ))}
                </ul>
            </nav>
                <div className="SideBar-btn-container">
                    <button onClick={() => setIsOpen(false)} >{"<"}</button>
                </div>
            </div>
        );
    }
    else {
        return (
            <div className="Sidebar-container">
                <nav className="Sidebar-closed"></nav>
                <div className="SideBar-btn-container">
                    <button onClick={() => setIsOpen(true)}>{">"}</button>
                </div>
            </div>
        );
    }
}

export function Content({ children }) {
    return (
        <div className="Content">
            {children}
        </div>
    );
}
