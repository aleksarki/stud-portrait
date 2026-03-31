import "./FlexRow.scss";

export const WRAP = {
    NO: "nowrap",
    DO: "wrap"
};

export const JUSTIFY = {
    START: "flex-start",
    END: "flex-end",
    CENTER: "center",
    SPACE_BETWEEN: "space-between"
};

export const ALIGN = {
    START: "flex-start",
    END: "flex-end",
    CENTER: "center",
    STRETCH: "stretch"
};

export const CONTENT = {
    START: "flex-start",
    END: "flex-end",
    CENTER: "center",
    STRETCH: "stretch"
};

function FlexRow({
    children, gap = "5", margin = "0", wrap = WRAP.NO, justify = JUSTIFY.START,
    align = ALIGN.STRETCH, content = CONTENT.STRETCH
}) {
    return (
        <div
            className="FlexRow"
            style={{
                "--gap": `${gap}px`,
                "--margin": margin.split(" ").map(value => value + "px").join(" "),
                "--wrap": wrap,
                "--justify": justify,
                "--align": align,
                "--content": content
            }}
        >
            {children}
        </div>
    );
}

export default FlexRow;
