// src/components/ui/ModalWindow.jsx
import React, { useState } from "react";

import "./ModalWindow.scss";

function ModalWindow({ children, title, visible = true, setVisible }) {
    if (!visible) {
        return null;
    }

    const arr = React.Children.toArray(children);

    const handleBackgroundClick = (e) => {
        if (e.target === e.currentTarget) {
            setVisible?.(false);
        }
    };

    return (
        <div 
            className="ModalWindow" 
            onClick={handleBackgroundClick}
        >
            <div className="content" onClick={(e) => e.stopPropagation()}>
                <div className="ModalHeader">
                    <span className="title">{title}</span>
                    <button 
                        className="close-btn"
                        onClick={() => setVisible?.(false)}
                        type="button"
                    >
                        ✕
                    </button>
                </div>
                {arr.find(child => child.type === ModalBody)}
                {arr.find(child => child.type === ModalFooter)}
            </div>
        </div>
    );
}

export function ModalBody({ children }) {
    return (
        <div className="ModalBody">{children}</div>
    );
}

export function ModalFooter({ children }) {
    return (
        <div className="ModalFooter">{children}</div>
    );
}

export default ModalWindow;

export function useModalWindow(title) {
    const [visible, setVisible] = useState(false);

    const modalWindow = ({ children }) => (
        <ModalWindow
            title={title}
            visible={visible}
            setVisible={setVisible}
        >
            {children}
        </ModalWindow>
    );

    return [modalWindow, visible, setVisible];
}
