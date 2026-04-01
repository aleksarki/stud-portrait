import React, { createContext, useContext } from "react";

import "./Table.scss";

const TableContext = createContext({ inHeader: false });

function Table({ children }) {
    const arr = React.Children.toArray(children);
    return (
        <table className="Table">
            {arr.find(child => child.type === TableHeader)}
            <tbody>
                <TableContext.Provider value={{ inHeader: false }}>
                    {arr.filter(child => child.type === TableRow)}
                </TableContext.Provider>
            </tbody>
        </table>
    );
}

export function TableHeader({ children }) {
    const arr = React.Children.toArray(children);
    return (
        <thead>
            <TableContext.Provider value={{ inHeader: true }}>
                <tr>
                    {arr.filter(child => child.type === TableItem)}
                </tr>
            </TableContext.Provider>
        </thead>
    );
}

export function TableRow({ children, key, className }) {
    const arr = React.Children.toArray(children);
    return (
        <tr key={key} className={className}>
            {arr.filter(child => child.type === TableItem)}
        </tr>
    );
}

export function TableItem({ children, key, className, title, onClick, cssVars }) {
    const {inHeader} = useContext(TableContext)
    const Cell = inHeader ? 'th' : 'td';
    const variables = cssVars && Object.fromEntries(
        Object
            .entries(cssVars)
            .filter(([key]) => key.startsWith("--"))
    );
    return (
        <Cell
            key={key}
            className={className}
            title={title}
            onClick={() => onClick?.()}
            style={variables}
        >
            {children}
        </Cell>
    );
}

export default Table;
