import { useState } from "react";
import "./Dropdown.scss";

function Dropdown({ handle, children }) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    }

    return (
        <div className="Dropdown">
            <div className="dropdown-handle" onClick={toggleDropdown}>
                {handle}
            </div>
            {isOpen && (
                <ul className="dropdown-menu">
                    {children?.map?.((child, index) => (
                        <li key={index} className="dropdown-item">
                            {child}
                        </li>
                    )) ?? (
                        <li key={0} className="dropdown-item">
                            {children}
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}

export default Dropdown;
