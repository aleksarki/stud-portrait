import "./ValueCard.scss";

function ValueCard({ value, text }) {
    return (
        <div className="ValueCard">
            <div className="value">{value}</div>
            <div className="text">{text}</div>
        </div>
    );
}

export default ValueCard;
