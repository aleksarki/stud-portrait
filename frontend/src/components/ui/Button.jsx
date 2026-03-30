import "./Button.scss";

export const BUTTON_PALETTE = {
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
    },
    RED: {
        normal: {
            fg: "rgb(68, 32, 32)",
            bg: "#f1caca",
            border: "solid 1px rgba(133, 62, 62, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, 0.75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        hover: {
            bg: "#dd9292"
        }
    },
    BROWN: {
        normal: {
            fg: "rgb(68, 58, 32)",
            bg: "#f0e5bf",
            border: "solid 1px rgba(133, 111, 62, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        hover: {
            bg: "#dfc771"
        }
    },
    YELLOW: {
        normal: {
            fg: "rgb(68, 66, 32)",
            bg: "#f7f19e",
            border: "solid 1px rgba(133, 128, 62, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        hover: {
            bg: "#d8cf4f"
        }
    },
    GREEN: {
        normal: {
            fg: "rgb(32, 68, 38)",
            bg: "#b9f8c7",
            border: "solid 1px rgba(64, 133, 62, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        hover: {
            bg: "#80ec9a"
        }
    },
    CYAN: {
        normal: {
            fg: "rgb(32, 63, 68)",
            bg: "#bfebf0",
            border: "solid 1px rgba(62, 122, 133, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        hover: {
            bg: "#75d7e2"
        },
        active: {
            bg: "#b4e7ec"
        }
    },
    BLUE: {
        normal: {
            fg: "rgb(32, 45, 68)",
            bg: "#c9d0f7",
            border: "solid 1px rgba(62, 81, 133, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        hover: {
            bg: "#a5afe9"
        }
    },
    PURPLE: {
        normal: {
            fg: "rgb(57, 32, 68)",
            bg: "#dcbff0",
            border: "solid 1px rgba(95, 62, 133, 0.8)",
            textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
            boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
        },
        hover: {
            bg: "#c595e5"
        }
    },
    STUDENT_BLUE: {
        normal: {
            fg: "white",
            bg: "linear-gradient(135deg, #2a9cfa 0%, #1976d2 100%)"
        },
        hover: {
            bg: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)"
        }
    },
    STUDENT_GREEN: {
        normal: {
            fg: "white",
            bg: "linear-gradient(135deg, #5fbe62 0%, #388e3c 100%)"
        },
        hover: {
            bg: "linear-gradient(135deg, #45a049 0%, #2e7d32 100%)"
        }
    }
};

function Button({ text, onClick, palette, disabled = false }) {

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
        <button
            className="Button"
            onClick={() => onClick?.()}
            disabled={disabled}
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
            {text}
        </button>
    );
}

export default Button;
