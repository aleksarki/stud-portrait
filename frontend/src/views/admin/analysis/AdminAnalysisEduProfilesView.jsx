import EduProfilesComparison from "../../../components/EduProfilesComparison";
import { SidebarLayout, LAYOUT_STYLE, Header, Sidebar, Content } from "../../../components/SidebarLayout";
import { LINK_TREE } from "../../../utilities";

import "./AdminAnalysisEduProfilesView.scss";

function AdminAnalysisEduProfilesView() {
    return (
        <div className="AdminAnalysisEduProfilesView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Анализ профилей образования" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>Сравнение областей образования</h2>
                    <p className="description">
                        Сравнение усреднённых профилей студентов по направлениям подготовки.
                        Анализ различий в мотивационных профилях и ценностях.
                    </p>
                    <EduProfilesComparison />
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnalysisEduProfilesView;
