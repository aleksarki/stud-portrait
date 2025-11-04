import "./SidebarLayout.scss";

function SidebarLayout({ sidebar, children, style = 'normal' }) {
    return (
        <div className="SidebarLayout">
            <div className={`style-${style}`}>
                <div className="sidebar">
                    {sidebar}
                </div>
                <div className="content">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default SidebarLayout;
