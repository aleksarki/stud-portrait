import './TabButton.scss';
export default function TabButton({ text, onClick, isActive }) {
    return (
        <button
            onClick={() => onClick}
            className={isActive ? 'active' : 'not-active'}
        >
            {text}
        </button>
    );
}
