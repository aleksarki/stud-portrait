import Header from "../../components/Header";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";

import "./AdminUploadView.scss";

function AdminUploadView() {
    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];
    return (
        <div className="AdminUploadView">
            <Header title="Админ: Загрузка данных" name="Администратор1" style="admin" />
            <div className="main-area">
                <SidebarLayout sidebar={<Sidepanel links={linkList} style="admin" />} style="admin">
                    content
                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminUploadView;
