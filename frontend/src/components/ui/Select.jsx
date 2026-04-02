import React from "react";

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

function Select({ children, value, onChange, palette = SELECT_PALETTE.GRAY }) {
    const arr = React.Children.toArray(children);

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
        <select
            className="Select"
            value={value}
            onChange={e => onChange?.(e.target.value)}
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
            {arr.filter(child => child.type === Option)}
        </select>
    );
}

export function Option({ value, label }) {
    return (
        <option value={value}>{label}</option>
    );
}

export default Select;