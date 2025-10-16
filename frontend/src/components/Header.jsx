import "./Header.scss";
import logo from "../static/logo_white.png";

function Header({ title }) {
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
                <a className="label" href="#">Войти</a>
            </div>
        </div>
    );
}

export default Header;
