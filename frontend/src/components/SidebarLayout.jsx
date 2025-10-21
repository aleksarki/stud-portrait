import "./SidebarLayout.scss";

function SidebarLayout({ sidebar, children }) {
    return (
        <div className="SidebarLayout">
            <div className="sidebar">
                {sidebar}
            </div>
            <div className="content">
                {children}
            </div>
        </div>
    );
}

export default SidebarLayout;
