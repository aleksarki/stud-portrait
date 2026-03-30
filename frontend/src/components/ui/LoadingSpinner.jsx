import "./LoadingSpinner.scss";

function LoadingSpinner({ loading = true, text }) {
    if (!loading) {
        return <></>;
    }

    return (
        <div className="LoadingSpinner">
            <div className="spinner"></div>
            <div className="loading-text">{text}</div>
        </div>
    );
}

export default LoadingSpinner;
