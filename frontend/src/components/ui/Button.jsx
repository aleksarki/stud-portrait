import "./Button.scss";

function Button({ text, onClick, fg, bg, border, hoverFg, hoverBg, hoverBorder, disabledBg, hoverTransform, disabled = false }) {
    //#6c757d
    return (
        <button
            className="Button"
            onClick={() => onClick?.()}
            style={{
                "--fg": fg,
                "--bg": bg,
                "--border": border ?? "none",
                "--hoverFg": hoverFg ?? fg,
                "--hoverBg": hoverBg ?? bg,
                "--hoverBorder": hoverBorder ?? "none",
                "--hoverTransform": hoverTransform ?? "translateY(-1px)",
                "--disabledBg": disabledBg ?? bg
            }}
            disabled={disabled}
        >
            {text}
        </button>
    );
}

export default Button;
