import { unpackPaletteOptionsActivable } from "./palette";

import "./Button.scss";

function Button({ text, onClick, palette, disabled = false }) {
    return (
        <button
            className="Button"
            onClick={() => onClick?.()}
            disabled={disabled}
            style={unpackPaletteOptionsActivable(palette)}
        >
            {text}
        </button>
    );
}

export default Button;
