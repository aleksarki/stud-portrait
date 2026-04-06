import "./NumberField.scss";

export const NUMBER_FIELD_PALETTE = {
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

function NumberField({ value, min, max, onChange, palette = NUMBER_FIELD_PALETTE.GRAY}) {
    const fg =         palette?.normal?.fg;
    const bg =         palette?.normal?.bg;
    const border =     palette?.normal?.border;
    const textShadow = palette?.normal?.textShadow;
    const boxShadow =  palette?.normal?.boxShadow;

    return (
        <input
            className="NumberField"
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={e => onChange?.(parseInt(e.target.value))}
            style={{
                "--fg":         fg,
                "--bg":         bg,
                "--border":     border,
                "--textShadow": textShadow,
                "--boxShadow":  boxShadow
            }}
        />
    );
}

export default NumberField;
