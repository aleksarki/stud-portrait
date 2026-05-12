import { createContext, useEffect, useRef, useState } from "react";

import { ADMIN_PALETTE, unpackPaletteOptionsActivable } from "./palette";

import "./Dropdown.scss";

export const DropdownContext = createContext({
    open: undefined,
    setOpen: undefined
});

function Dropdown({ children, label, palette = ADMIN_PALETTE.GRAY, disabled = false }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    // close on click elsewhere
    useEffect(() => {
        const handleClickOutside = event => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div
            className="Dropdown"
            ref={dropdownRef}
            style={unpackPaletteOptionsActivable(palette)}
        >
            <div
                className={`dropdown-field ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setOpen(!open)}
            >
                <span>{label}</span>
                <span>{open ? "▲" : "▼"}</span>
            </div>
            <div className={`drowdown-menu ${open ? 'open' : ''}`}>
                <DropdownContext.Provider value={{open: open, setOpen: setOpen}}>
                    {children}
                </DropdownContext.Provider>
            </div>
        </div>
    );
}

export default Dropdown;
