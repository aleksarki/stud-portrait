import { ADMIN_PALETTE, unpackPaletteOptions } from "./palette";

import "./NumberField.scss";

function NumberField({ value, min, max, onChange, palette = ADMIN_PALETTE.GRAY}) {
    return (
        <input
            className="NumberField"
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={e => onChange?.(parseInt(e.target.value))}
            style={unpackPaletteOptions(palette)}
        />
    );
}

export default NumberField;
