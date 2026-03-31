import Card from "./Card";

import "./ValueCard.scss";

function ValueCard({ value, text }) {
    return (
        <Card>
            <div className="value">{value}</div>
            <div className="text">{text}</div>
        </Card>
    );
}

export default ValueCard;
