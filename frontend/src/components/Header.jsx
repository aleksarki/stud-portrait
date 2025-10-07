import "./Header.scss";
import logo_utmn from "../static/logo_utmn_white.png";

function Header() {
    return (
        <div className="Header">
            <div className="left-side">
                <img src={logo_utmn} width="120" height="55" alt="Тюменский государственный университет" class="no-movement"></img>
                <span className="title">StudPortrait</span>
            </div>
            <div className="right-side">
                <a className="label" href="#">Войти</a>
            </div>
        </div>
    );
}

export default Header;
