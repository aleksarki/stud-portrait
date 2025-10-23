import "./Header.scss";
import logo from "../static/logo_white.png";
import Dropdown from "./Dropdown";

function Header({ title, name }) {
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

export default Header;
