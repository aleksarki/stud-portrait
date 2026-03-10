import "./SidebarLayout.scss";

export const SIDEBAR_STYLE = {
    ADMIN:  "admin",
    MODEUS: "modeus",
    NORMAL: "normal"
};

export function SidebarLayout({ children, style = SIDEBAR_STYLE.NORMAL }) {
    return (
        <div className="SidebarLayout">
            <div className={`style-${style}`}>
                {children}
            </div>
        </div>
    );
}

export function Sidebar({ links }) {
    return (
        <nav className="Sidebar">
            <div className="inner">
                <ul className="list">
                    {links?.map?.((link, index) => (
                        <li key={index} className="item">
                            <a href={link.to}>{link.title}</a>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
}

export function SidebarLayoutContent({ children }) {
    return (
        <div className="SidebarLayoutContent">
            {children}
        </div>
    );
}
