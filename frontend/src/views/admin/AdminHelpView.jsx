import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import { LINK_TREE } from "../../utilities";

import "./AdminHelpView.scss";

function AdminHelpView() {
    return (
        <div className="AdminHelpView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Справка (библиотека)" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <span>content</span>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminHelpView;
