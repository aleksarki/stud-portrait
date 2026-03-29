import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import "./AdminHelpView.scss";

function AdminHelpView() {
    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];
    return (
        <div className="AdminHelpView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Справка (библиотека)" name="Администратор1" />
                <Sidebar links={linkList} />
                <Content>
                    <span>content</span>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminHelpView;
