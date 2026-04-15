import { useEffect, useState } from "react";
import "./Slider.scss";

function Slider({ values = [], initValue, onChange, label, disabled = false }) {
    const [selected, setSelected] = useState(initValue || values[0]);

    // Находим индекс выбранного года для слайдера
    const selectedIndex = values.indexOf(selected);
    const maxIndex = values.length - 1;

    const handleSliderChange = event => {
        const index = parseInt(event.target.value, 10);
        const value = values[index];
        setSelected(value);
        onChange?.(value);
    };

    const handlePrev = () => {
        if (selectedIndex > 0) {
            const value = values[selectedIndex - 1];
            setSelected(value);
            onChange?.(value);
        }
    };

    const handleNext = () => {
        if (selectedIndex < maxIndex) {
            const value = values[selectedIndex + 1];
            setSelected(value);
            onChange?.(value);
        }
    };

    // Если values изменился снаружи, обновляем внутреннее состояние
    useEffect(() => {
        if (initValue && initValue !== selected) {
            setSelected(initValue);
        }
    }, [initValue]);

    if (!values.length) {
        return null;
    }

    return (
        <div className={`Slider ${disabled ? 'disabled' : ''}`}>
            {label && <label className="slider-label">{label}</label>}

            <div className="selected-year-display">
                <span className="year-badge">{selected}</span>
            </div>
            
            <div className="slider-container">
                <button 
                    className="slider-nav prev"
                    onClick={handlePrev}
                    disabled={disabled || selectedIndex === 0}
                    type="button"
                >
                    ‹
                </button>

                <div className="slider-track-container">
                    <input
                        type="range"
                        className="slider-input"
                        min={0}
                        max={maxIndex}
                        value={selectedIndex}
                        onChange={handleSliderChange}
                        disabled={disabled}
                        step={1}
                    />
                    <div className="slider-markers">
                        {values.map((value, index) => (
                            <div 
                                key={value}
                                className={`slider-marker ${index === selectedIndex ? 'active' : ''}`}
                                style={{ left: `${(index / maxIndex) * 100}%` }}
                            >
                                <span className="marker-dot"></span>
                                <span className="marker-label">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <button 
                    className="slider-nav next"
                    onClick={handleNext}
                    disabled={disabled || selectedIndex === maxIndex}
                    type="button"
                >
                    ›
                </button>
            </div>
        </div>
    );
}

export default Slider;
