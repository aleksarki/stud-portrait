import "./ColorBox.scss";

export const BOX_COLOR = {
    GRAY: "hsla(210, 20%, 98%, 0.75)",
    RED: "rgba(255, 201, 201, 0.75)",
    YELLOW: "rgba(252, 240, 73, 0.75)",
    LIME: "rgba(198, 230, 84, 0.75)",
    GREEN: "rgba(73, 168, 73, 0.5)",
    BLUE: "rgba(190, 229, 235, 0.75)"
};

function ColorBox({ color }) {
    return (
        <span
            className="ColorBox"
            style={{
                "--background": color
            }}
        />
    );
}

export default ColorBox;
