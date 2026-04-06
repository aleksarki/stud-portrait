import { createContext, useEffect, useRef, useState } from "react";

import "./Dropdown.scss";

export const DROPDOWN_PALETTE = {
    GRAY: {
        normal: {
            fg: "rgb(71, 71, 71)",
            bg: "#f0f0f0",
            border: "solid 1px rgba(126, 126, 126, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        hover: {
            bg: "#cacaca"
        }
    }
};

export const DropdownContext = createContext({
    open: undefined,
    setOpen: undefined
});

function Dropdown({ children, label, palette = DROPDOWN_PALETTE.GRAY, disabled = false }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fg =         palette?.normal?.fg;
    const bg =         palette?.normal?.bg;
    const border =     palette?.normal?.border;
    const textShadow = palette?.normal?.textShadow;
    const boxShadow =  palette?.normal?.boxShadow;

    const hoverFg =         palette?.hover?.fg ??         palette?.normal?.fg;
    const hoverBg =         palette?.hover?.bg ??         palette?.normal?.bg;
    const hoverBorder =     palette?.hover?.border ??     palette?.normal?.border;
    const hoverTextShadow = palette?.hover?.textShadow ?? palette?.normal?.textShadow;
    const hoverBoxShadow =  palette?.hover?.boxShadow ??  palette?.normal?.boxShadow;
    const hoverTransform =  palette?.hover?.transform; // "translateY(-1px)"

    const activeFg =         palette?.active?.fg ??         palette?.normal?.fg ??         palette?.hover?.fg;
    const activeBg =         palette?.active?.bg ??         palette?.normal?.bg ??         palette?.hover?.bg;
    const activeBorder =     palette?.active?.border ??     palette?.normal?.border ??     palette?.hover?.border;
    const activeTextShadow = palette?.active?.textShadow ?? palette?.normal?.textShadow ?? palette?.hover?.textShadow;
    const activeBoxShadow =  palette?.active?.boxShadow ??  palette?.normal?.boxShadow ??  palette?.hover?.boxShadow;

    const disabledFg =         palette?.disabled?.fg ??         palette?.normal?.fg;
    const disabledBg =         palette?.disabled?.bg ??         palette?.normal?.bg;
    const disabledBorder =     palette?.disabled?.border ??     palette?.normal?.border;
    const disabledTextShadow = palette?.disabled?.textShadow ?? palette?.normal?.textShadow;
    const disabledBoxShadow =  palette?.disabled?.boxShadow ??  palette?.normal?.boxShadow;

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
            style={{
                "--fg":         fg,
                "--bg":         bg,
                "--border":     border,
                "--textShadow": textShadow,
                "--boxShadow":  boxShadow,

                "--hoverFg":         hoverFg,
                "--hoverBg":         hoverBg,
                "--hoverBorder":     hoverBorder,
                "--hoverTextShadow": hoverTextShadow,
                "--hoverBoxShadow":  hoverBoxShadow,
                "--hoverTransform":  hoverTransform,

                "--activeFg":         activeFg,
                "--activeBg":         activeBg,
                "--activeBorder":     activeBorder,
                "--activeTextShadow": activeTextShadow,
                "--activeBoxShadow":  activeBoxShadow,

                "--disabledFg":         disabledFg,
                "--disabledBg":         disabledBg,
                "--disabledBorder":     disabledBorder,
                "--disabledTextShadow": disabledTextShadow,
                "--disabledBoxShadow":  disabledBoxShadow
            }}
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
