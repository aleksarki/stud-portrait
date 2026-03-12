import Header from "../../components/Header";
import { Sidebar, SIDEBAR_STYLE, SidebarLayout, SidebarLayoutContent } from "../../components/SidebarLayout";
import Title from "../../components/Title";
import "./AdminMainView.scss";

function AdminMainView() {
    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];
    return (
        <div className="AdminMainView">
            <Header title="Админ: Главная" name="Администратор1" style="modeus" />
            <div className="main-area">
                <SidebarLayout style={SIDEBAR_STYLE.MODEUS}>
                    <Sidebar links={linkList} />
                    <SidebarLayoutContent>
                        <span>content</span>
                    </SidebarLayoutContent>
                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminMainView;
