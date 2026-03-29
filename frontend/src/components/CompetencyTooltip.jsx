import "./CompetencyTooltip.scss";

function CompetencyTooltip({ name, description, position, children }) {
    return (
        <div className="CompetencyTooltip" style={{ left: position.x, top: position.y }}>
            <div className="tooltip-header">
                <h3 className="competency-title">{name}</h3>
            </div>
            {children}
            {description && (
                <div className="competency-description">
                    {description}
                </div>
            )}
        </div>
    );
}

export default CompetencyTooltip;
