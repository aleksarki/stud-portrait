import { useState } from "react";
import Header from "../../components/Header";
import { Sidebar, SIDEBAR_STYLE, SidebarLayout, SidebarLayoutContent } from "../../components/SidebarLayout";

import "./AdminUploadView.scss";

function AdminUploadView() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);

    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];

    // Конфигурация для парсинга Excel (как в Postman)
    const defaultConfig = {
        "sheets": [
            {
            "name": "Сравнение по компетенциям",
            "start_row": 4,
            "columns": {
                "center_name": "H",

                "edu_level_name": "L",

                "inst_name": "I",

                "part_name": "C",
                "part_gender": "E",
                "part_institution": "I",
                "part_spec": "O",
                "part_edu_level": "L",
                "part_form": "N",
                "part_course_num": "M",

                "res_center": "H",
                "res_institution": "I",
                "res_edu_level": "L",
                "res_form": "N",
                "res_spec": "O",
                "res_course_num": "M",
                "res_year": "B",
                "res_high_potential": "D",
                "res_summary_report": "P",

                "res_comp_info_analysis": "Q",
                "res_comp_planning": "R",
                "res_comp_result_orientation": "S",
                "res_comp_stress_resistance": "T",
                "res_comp_partnership": "U",
                "res_comp_rules_compliance": "V",
                "res_comp_self_development": "W",
                "res_comp_leadership": "X",
                "res_comp_emotional_intel": "Y",
                "res_comp_client_focus": "Z",
                "res_comp_communication": "AA",
                "res_comp_passive_vocab": "AB",

                "spec_name": "O",

                "form_name": "N"
            }
            },
            {
            "name": "Мотивационный профиль",
            "start_row": 4,
            "columns": {
                "part_name": "B",
                "res_year": "C",
                
                "res_mot_autonomy": "D",
                "res_mot_altruism": "E",
                "res_mot_challenge": "F",
                "res_mot_salary": "G",
                "res_mot_career": "H",
                "res_mot_creativity": "I",
                "res_mot_relationships": "J",
                "res_mot_recognition": "K",
                "res_mot_affiliation": "L",
                "res_mot_self_development": "M",
                "res_mot_purpose": "N",
                "res_mot_cooperation": "O",
                "res_mot_stability": "P",
                "res_mot_tradition": "Q",
                "res_mot_management": "R",
                "res_mot_work_conditions": "S"
            }
            },
            {
            "name": "Образовательные курсы",
            "start_row": 4,
            "columns":{
                "part_name": "B",
                "course_an_dec": "C",
                "course_client_focus": "D",
                "course_communication": "E",
                "course_leadership": "F",
                "course_result_orientation": "G",
                "course_planning_org": "H",
                "course_rules_culture": "I",
                "course_self_dev": "J",
                "course_collaboration": "K",
                "course_stress_resistance": "L",
                "course_emotions_communication": "M",
                "course_negotiations": "N",
                "course_digital_comm": "O",
                "course_effective_learning": "P",
                "course_entrepreneurship": "Q",
                "course_creativity_tech": "R",
                "course_trendwatching": "S",
                "course_conflict_management": "T",
                "course_career_management": "U",
                "course_burnout": "V",
                "course_cross_cultural_comm": "W",
                "course_mentoring": "X"
            }
            },
            {
            "name": "Итоги успеваемости участников",
            "start_row": 2,
            "columns": {
                "part_name": "B",
                "perf_year": "A",
                "perf_current_avg": "C",
                "perf_digital_culture": "D",
                "perf_main_attestation": "E",
                "perf_first_retake": "F",
                "perf_second_retake": "G",
                "perf_high_grade_retake": "H",
                "perf_final_grade": "I"
                }
            }
        ]
        };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
        setUploadResult(null);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedFile) {
            setError("Пожалуйста, выберите файл");
            return;
        }

        setUploading(true);
        setError(null);
        setUploadResult(null);

        try {
            // Создаём FormData для отправки файла
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('config_json', JSON.stringify(defaultConfig));

            console.log('📤 Отправка файла:', selectedFile.name);

            // Отправляем на backend
            const response = await fetch('http://localhost:8000/portrait/import_excel/', {
                method: 'POST',
                body: formData
            });

            console.log('📡 Ответ получен:', response.status);

            const data = await response.json();
            console.log('📦 Данные:', data);

            if (data.status === 'success') {
                setUploadResult({
                    success: true,
                    created: data.created,
                    updated: data.updated
                });
                
                // Очищаем выбранный файл
                setSelectedFile(null);
                document.getElementById('excel-file').value = '';
                
            } else {
                setError(data.message || 'Ошибка загрузки данных');
            }

        } catch (err) {
            console.error('❌ Ошибка:', err);
            setError(`Ошибка подключения к серверу: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="AdminUploadView">
            <Header title="Админ: Загрузка данных" name="Администратор1" style="modeus" />
            <div className="main-area">
                <SidebarLayout style={SIDEBAR_STYLE.MODEUS}>
                    <Sidebar links={linkList} />
                    <SidebarLayoutContent>
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
                                        accept=".xlsx, .xls"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                    />
                                    {selectedFile && (
                                        <div className="selected-file">
                                            ✓ Выбран файл: <strong>{selectedFile.name}</strong>
                                        </div>
                                    )}
                                    <div className="file-hint">
                                        Поддерживаемые форматы: .xlsx, .xls
                                    </div>
                                </div>

                                {/* Информация о структуре файла */}
                                <div className="info-block">
                                    <h3>📋 Требования к структуре файла:</h3>
                                    <ul>
                                        <li>Лист "Сравнение по компетенциям" (данные с 3 строки)</li>
                                        <li>Лист "Мотивационный профиль" (данные с 3 строки)</li>
                                        <li>Лист "Образовательные курсы" (данные с 3 строки)</li>
                                        <li>Лист "Итоги успеваемости участников" (данные с 3 строки)</li>
                                    </ul>
                                </div>
                                
                                {/* Результат загрузки */}
                                {uploadResult && (
                                    <div className="upload-success">
                                        <div className="success-icon">✅</div>
                                        <h3>Данные успешно загружены!</h3>
                                        <div className="upload-stats">
                                            <div className="stat">
                                                <span className="stat-label">Создано записей:</span>
                                                <span className="stat-value">{uploadResult.created}</span>
                                            </div>
                                            <div className="stat">
                                                <span className="stat-label">Обновлено записей:</span>
                                                <span className="stat-value">{uploadResult.updated}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Ошибка */}
                                {error && (
                                    <div className="upload-error">
                                        <div className="error-icon">❌</div>
                                        <div className="error-message">{error}</div>
                                    </div>
                                )}
                                
                                <button
                                    type="submit"
                                    className="submit-button"
                                    disabled={uploading || !selectedFile}
                                >
                                    {uploading ? '⏳ Загрузка...' : '📤 Загрузить данные'}
                                </button>
                            </form>
                        </div>
                    </SidebarLayoutContent>
                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminUploadView;