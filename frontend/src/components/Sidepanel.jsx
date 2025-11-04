import "./Sidepanel.scss";

function Sidepanel({ links, style = 'normal' }) {
    return (
        <nav className="Sidepanel">
            <div className={`style-${style}`}>
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

export default Sidepanel;
