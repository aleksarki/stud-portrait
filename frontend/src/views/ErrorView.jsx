import { useRouteError } from "react-router-dom";

import { Content, Header, LAYOUT_STYLE, SidebarLayout } from "../components/SidebarLayout";
import Title from "../components/Title";

import "./ErrorView.scss";

function ErrorView() {
    const error = useRouteError();
    console.error(error);

    return (
        <div className="ErrorView">
            <SidebarLayout style={LAYOUT_STYLE.NORMAL}>
                <Header />
                <Content>
                    <Title title="Несуществующая страница" />
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default ErrorView;
