import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import Title from "../../components/Title";
import { LINK_TREE } from "../../utilities";

import "./AdminMainView.scss";

function AdminMainView() {
    return (
        <div className="AdminMainView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Главная" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <span>content</span>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminMainView;
