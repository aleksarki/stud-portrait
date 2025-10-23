import { useRouteError } from "react-router-dom";
import Header from "../components/Header";
import Title from "../components/Title";
import "./ErrorView.scss";

function ErrorView() {
    const error = useRouteError();
    console.error(error);
    return (
        <div className="ErrorView">
            <Header />
            <Title title="Несуществующая страница" />
        </div>
    );
}

export default ErrorView;
