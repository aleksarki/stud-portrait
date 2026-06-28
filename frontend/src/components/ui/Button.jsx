import { unpackPaletteOptionsActivable } from "./palette";

import "./Button.scss";

function Button({ text, onClick, palette, disabled = false, type = 'button' }) {
    return (
        <button
            className="Button"
            type={type}
            onClick={() => onClick?.()}
            disabled={disabled}
            style={unpackPaletteOptionsActivable(palette)}
        >
            {text}
        </button>
    );
}

export default Button;
