import Card from "./Card";

import "./TitledCard.scss";

function TitledCard({ children, title }) {
    return (
        <Card>
            <div className="title">{title}</div>
            {children}
        </Card>
    );
}

export default TitledCard;
