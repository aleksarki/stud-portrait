import "./Label.scss";

export const LABEL_PALETTE = {
    GRAY: {
        fg: "rgba(71, 71, 71, 0.8)",
        bg: "#f0f0f080",
        border: "solid 1px rgba(126, 126, 126, 0.8)",
        textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
        boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
    }
};

function Label({ text, children, palette = LABEL_PALETTE.GRAY }) {

    const fg =         palette?.fg;
    const bg =         palette?.bg;
    const border =     palette?.border;
    const textShadow = palette?.textShadow;
    const boxShadow =  palette?.boxShadow;

    return (
        <span
            className="Label"
            style={{
                "--fg":         fg,
                "--bg":         bg,
                "--border":     border,
                "--textShadow": textShadow,
                "--boxShadow":  boxShadow
            }}
        >
            {text}
            {children}
        </span>
    );
}

export default Label;
