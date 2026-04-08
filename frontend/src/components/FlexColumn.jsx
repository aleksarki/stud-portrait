import "./FlexColumn.scss";

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

function FlexColumn({
    className, children, reverse = false, wrap = WRAP.NO,
    justify = JUSTIFY.START, align = ALIGN.STRETCH, content = CONTENT.STRETCH
}) {
    return (
        <div
            className={`FlexColumn ${className}`}
            style={{
                "--direction": reverse ? "column-reverse" : "column",
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

export default FlexColumn;
