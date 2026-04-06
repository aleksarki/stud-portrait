import React, { createContext, useContext, useState } from "react";

import "./Select.scss";

export const SELECT_PALETTE = {
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

const SelectContext = createContext({
    selected: undefined,
    valueSetter: undefined,
    labelSetter: undefined,
    onChangeCallback: undefined,
    isOpenSetter: undefined
});

function Select({ children, value, onChange, palette = SELECT_PALETTE.GRAY, disabled = false }) {
    const arr = React.Children.toArray(children);
    
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(value);
    const [label, setLabel] = useState(
        arr
            .filter(child => child.type === Option)
            .find(child => child.props.value === value)
            ?.props?.label
    );

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

    return (
        <div
            className="Select"
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
                className={`field ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setOpen(!open)}
            >
                <span>{label}</span>
                <span>{open ? "▲" : "▼"}</span>
            </div>
            <div className={`dropdown ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`}>
                <SelectContext.Provider
                    value={{
                        selected: selected,
                        valueSetter: setSelected,
                        labelSetter: setLabel,
                        isOpenSetter: setOpen,
                        onChangeCallback: onChange
                    }}
                >
                    {arr.filter(child => child.type === Option)}
                </SelectContext.Provider>
            </div>
        </div>
    );
}

export function Option({ value, label }) {
    const {
        selected,
        valueSetter,
        labelSetter,
        onChangeCallback,
        isOpenSetter
    } = useContext(SelectContext);
    return (
        <div
            className={`option ${selected === value ? 'selected' : ''}`}
            onClick={() => {
                valueSetter?.(value);
                labelSetter?.(label);
                onChangeCallback?.(value);
                isOpenSetter(false);
            }}
        >
            {label}
        </div>
    );
}

export default Select;
