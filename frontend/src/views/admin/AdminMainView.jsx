import Header from "../../components/Header";
import Title from "../../components/Title";
import "./AdminMainView.scss";

function AdminMainView() {
    return (
        <div className="StudentMainView">
            <Header title="Профиль" name="Администратор" />
            <Title title="Главная страница" />
        </div>
    );
}

export default AdminMainView;
