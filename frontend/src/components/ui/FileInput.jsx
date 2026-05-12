import { unpackPaletteOptionsActivable } from "./palette";

import "./FileInput.scss";

function FileInput({ id, accept, onChange, palette, disabled = false }) {

    return (
        <input
            className="FileInput"
            id={id}
            type="file"
            accept={accept}
            onChange={e => onChange?.(e.target.files)}
            disabled={disabled}
            style={unpackPaletteOptionsActivable(palette)}
        />
    );
}

export default FileInput;
