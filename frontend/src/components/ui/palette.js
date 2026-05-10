
function formPalette(normal, hover, active) {
    return {
        normal: normal,
        hover: hover,
        active: active,
        ...normal
    };
}

export const ADMIN_PALETTE = {
    GRAY: formPalette(
        {
            fg: "rgb(71, 71, 71)",
            bg: "#f0f0f0",
            border: "solid 1px rgba(126, 126, 126, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        { bg: "#cacaca" }
    ),
    RED: formPalette(
        {
            fg: "rgb(68, 32, 32)",
            bg: "#f1caca",
            border: "solid 1px rgba(133, 62, 62, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, 0.75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        { bg: "#dd9292" }
    ),
    BROWN: formPalette(
        {
            fg: "rgb(68, 58, 32)",
            bg: "#f0e5bf",
            border: "solid 1px rgba(133, 111, 62, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        { bg: "#dfc771" }
    ),
    YELLOW: formPalette(
        {
            fg: "rgb(68, 66, 32)",
            bg: "#f7f19e",
            border: "solid 1px rgba(133, 128, 62, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        { bg: "#d8cf4f" }
    ),
    GREEN: formPalette(
        {
            fg: "rgb(32, 68, 38)",
            bg: "#b9f8c7",
            border: "solid 1px rgba(64, 133, 62, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        { bg: "#80ec9a" }
    ),
    CYAN: formPalette(
        {
            fg: "rgb(32, 63, 68)",
            bg: "#bfebf0",
            border: "solid 1px rgba(62, 122, 133, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        { bg: "#75d7e2" },
        { bg: "#b4e7ec" }
    ),
    BLUE: formPalette(
        {
            fg: "rgb(32, 45, 68)",
            bg: "#c9d0f7",
            border: "solid 1px rgba(62, 81, 133, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        { bg: "#a5afe9" }
    ),
    PURPLE: formPalette(
        {
            fg: "rgb(57, 32, 68)",
            bg: "#dcbff0",
            border: "solid 1px rgba(95, 62, 133, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        { bg: "#c595e5" }
    )
};

export const STUDENT_PALETTE = {
    BLUE: formPalette(
        {
            fg: "white",
            bg: "linear-gradient(135deg, #2a9cfa 0%, #1976d2 100%)"
        },
        { bg: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)" }
    ),
    GREEN: formPalette(
        {
            fg: "white",
            bg: "linear-gradient(135deg, #5fbe62 0%, #388e3c 100%)"
        },
        { bg: "linear-gradient(135deg, #45a049 0%, #2e7d32 100%)" }
    )
};

export function unpackPaletteOptions(palette) {
    const fg =         palette?.fg;
    const bg =         palette?.bg;
    const border =     palette?.border;
    const textShadow = palette?.textShadow;
    const boxShadow =  palette?.boxShadow;

    return {
        "--fg":         fg,
        "--bg":         bg,
        "--border":     border,
        "--textShadow": textShadow,
        "--boxShadow":  boxShadow
    };
}

export function unpackPaletteOptionsActivable(palette) {
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

    return {
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
    };
}
