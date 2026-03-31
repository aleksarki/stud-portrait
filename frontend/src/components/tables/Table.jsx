import React from "react";

import "./Table.scss";

function Table({ children }) {
    const arr = React.Children.toArray(children);
    return (
        <table className="Table">
            {arr.find(child => child.type === TableHeader)}
            <tbody>
                {arr.filter(child => child.type === TableRow)}
            </tbody>
        </table>
    );
}

export function TableHeader({ children }) {
    const arr = React.Children.toArray(children);
    return (
        <thead>
            <tr>
                {arr
                    .filter(child => child.type === TableItem)
                    .map(child => <th>{child.props.children}</th>)
                }
            </tr>
        </thead>
    );
}

export function TableRow({ children, key }) {
    const arr = React.Children.toArray(children);
    return (
        <tr key={key}>
            {arr.filter(child => child.type === TableItem)}
        </tr>
    );
}

export function TableItem({ children, title, style }) {
    return (
        <td title={title} style={style}>{children}</td>
    );
}

export default Table;
