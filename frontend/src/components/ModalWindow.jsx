import React, { useState } from "react";

import "./ModalWindow.scss";

function ModalWindow({ children, title, visible = true, setVisible }) {
    if (!visible) {
        return <></>;
    }

    const arr = React.Children.toArray(children);

    return (
        <div className="ModalWindow">
            <div className="content">
                <div className="ModalHeader">
                    <span className="title">{title}</span>
                    <button 
                        className="close-btn"
                        onClick={() => setVisible?.(false)}
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
