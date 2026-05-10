import { unpackPaletteOptions } from "./palette";

import "./Label.scss";

export const LABEL_PALETTE = {
    GRAY: {
        fg: "rgba(71, 71, 71, 0.8)",
        bg: "#f0f0f080",
        border: "solid 1px rgba(126, 126, 126, 0.8)",
        textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
        boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
    },
    GREEN: {
        fg: "rgb(32, 68, 38)",
        bg: "#b9f8c7",
        border: "solid 1px rgba(64, 133, 62, 0.8)",
        textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
        boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
    },
    RED: {
        fg: "rgb(68, 32, 32)",
        bg: "#f1caca",
        border: "solid 1px rgba(133, 62, 62, 0.8)",
        textShadow: "0 1px 1px rgba(255, 255, 255, 0.75)",
        boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
    },
    YELLOW: {
        fg: "rgb(68, 66, 32)",
        bg: "#f7f19e",
        border: "solid 1px rgba(133, 128, 62, 0.8)",
        textShadow: "0 1px 1px rgba(255, 255, 255, .75)",
        boxShadow: "inset 0 1px #fff3, 0 1px 2px #0000000d"
    }
};

function Label({ text, children, palette = LABEL_PALETTE.GRAY }) {
    return (
        <span
            className="Label"
            style={unpackPaletteOptions(palette)}
        >
            {text}
            {children}
        </span>
    );
}

export default Label;
