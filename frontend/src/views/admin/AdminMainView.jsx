import Header from "../../components/Header";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Title from "../../components/Title";
import "./AdminMainView.scss";

function AdminMainView() {
    const linkList = [
        {to:'/admin/1', title: "Главная"},
        {to:'/admin/1', title: "Статистика тестирования"},
        {to:'/admin/1', title: "Участники"},
        {to:'/admin/1', title: "Образовательные курсы"},
        {to:'/admin/1', title: "Выгрузка результатов"},
        {to:'/admin/1', title: "Загрузка данных"},
    ];
    return (
        <div className="AdminMainView">
            <Header title="Админ: Главная" name="Администратор1" style="admin" />
            <div className="main-area">
                <SidebarLayout sidebar={<Sidepanel links={linkList} style="admin" />} style="admin">
                    content
                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminMainView;
