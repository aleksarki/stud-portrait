import Dropdown from "./Dropdown";
import logo from "../static/logo_white.png";
import "./Header.scss";

function Header({ title, name, style = 'normal' }) {
    return (
        <div className="Header">
            <div className={`style-${style}`}>
                <div className="left-side">
                    <div className="logo-area">
                        <img src={logo} height="55" alt="Тюменский государственный университет" />
                        <span className="logo-title">StudPortrait</span>
                    </div>
                    {style === 'admin' && (
                        <div className="menu-toggler">X</div>
                    )}
                    <span className="title">{title}</span>
                </div>
                <div className="right-side">
                    <Dropdown handle={<span className="menu-handle">{name}</span>}>
                        <span style={{cursor: "pointer"}}>Выход</span>
                    </Dropdown>
                </div>
            </div>
        </div>
    );
}

export default Header;
