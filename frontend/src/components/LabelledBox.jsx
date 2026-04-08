import "./LabelledBox.scss";

export const BOX_PALETTE = {
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

function LabelledBox({
    children, label, palette = BOX_PALETTE.GRAY,
    bordered = false, inrow = false, nopad = false
}) {
    const fg =         palette?.normal?.fg;
    const bg =         palette?.normal?.bg;
    const border =     bordered ? palette?.normal?.border : 'none';
    const textShadow = palette?.normal?.textShadow;
    const boxShadow =  bordered ? palette?.normal?.boxShadow : 'none';

    return (
        <div
            className="LabelledBox"
            style={{
                "--fg":          fg,
                "--bg":          bg,
                "--border":      border,
                "--textShadow":  textShadow,
                "--boxShadow":   boxShadow,
                "--padding":     nopad ? 'none' : '4px 8px 8px 8px',
                "display":       inrow ? "flex" : "block",
                "flexDirection": "row",
                "alignItems":    "center",
                "gap":           "5px"
            }}
        >
            <div
                className="box-label"
                style={{
                    "marginLeft": inrow ? 'none' : "15px",
                    "marginBottom": inrow ? 'none' : "4px"
                }}
            >
                {label}</div>
            <div>{children}</div>
        </div>
    );
}

export default LabelledBox;
