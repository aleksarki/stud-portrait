import "./Sidepanel.scss";

function Sidepanel({ links }) {
    return (
        <nav className="Sidepanel">
            <ul className="list">
                {links?.map?.((link, index) => (
                    <li key={index} className="item">
                        <a href={link.to}>{link.title}</a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export default Sidepanel;
