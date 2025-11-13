import Header from "../../components/Header";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";

import "./AdminAnalysisView.scss";

function AdminAnalysisView() {
    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];
    return (
        <div className="AdminAnalysisView">
            <Header title="Админ: Анализ данных" name="Администратор1" style="modeus" />
            <div className="main-area">
                <SidebarLayout sidebar={<Sidepanel links={linkList} style="modeus" />} style="modeus">
                    content
                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminAnalysisView;