import "./TabButton.scss";
const TabButton = (text, onClick, isActive ) => {
    return (
        <button
            onClick={() => onClick}
            className={isActive ? "active" : "not-active"}
        >{text}</button>
    );
}
export default TabButton;