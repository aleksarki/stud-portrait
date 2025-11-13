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

    const handleSubmit = e => {
        e.preventDefault();
        // Функционал будет добавлен позже
        console.log("Форма отправлена - функционал в разработке");
    };

    return (
        <div className="AdminUploadView">
            <Header title="Админ: Загрузка данных" name="Администратор1" style="modeus" />
            <div className="main-area">
                <SidebarLayout sidebar={<Sidepanel links={linkList} style="modeus" />} style="modeus">
                    <div className="upload-form-container">
                        <h2 className="upload-form-title">
                            Загрузка данных результатов тестирования "Россия - страна возможностей"
                        </h2>
                        
                        <form className="upload-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="excel-file" className="file-label">
                                    Выберите Excel файл
                                </label>
                                <input
                                    type="file"
                                    id="excel-file"
                                    className="file-input"
                                    accept=".xlsx, .xls, .csv"
                                    disabled // Пока не функционирует
                                />
                                <div className="file-hint">
                                    Поддерживаемые форматы: .xlsx, .xls, .csv
                                </div>
                            </div>
                            
                            <button
                                type="submit"
                                className="submit-button"
                                disabled // Пока не функционирует
                            >
                                Загрузить данные
                            </button>
                        </form>
                    </div>
                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminUploadView;
