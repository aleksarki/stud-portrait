// src/components/ResumeBuilderModal.jsx
import React, { useState, useEffect } from "react";
import ModalWindow, { ModalBody, ModalFooter } from "./ModalWindow";
import Button from "./ui/Button";
import { STUDENT_PALETTE } from "./ui/palette";
import { getStudentResumeData, generateResumeDocx } from "../api";

import "./ResumeBuilderModal.scss";

function ResumeBuilderModal({ visible, setVisible, studentId, studentName }) {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    
    // Поля формы
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [graduationYear, setGraduationYear] = useState("");
    const [workExperience, setWorkExperience] = useState("");
    const [courses, setCourses] = useState("");
    const [languages, setLanguages] = useState("");
    const [skills, setSkills] = useState("");
    const [aiSkills, setAiSkills] = useState(null);
    const [showAiSkills, setShowAiSkills] = useState(false);

    // Загрузка AI-навыков при открытии
    useEffect(() => {
        if (visible && studentId) {
            loadAiSkills();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, studentId]);

    const loadAiSkills = async () => {
        setLoading(true);
        try {
            const response = await getStudentResumeData(studentId, undefined);
            const data = await response.json();
            if (data.status === 'success' && data.data?.competencies) {
                const comps = data.data.competencies;
                const skillsList = comps
                    .filter(comp => comp.score > 400)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 6)
                    .map(comp => comp.name);
                setAiSkills(skillsList);
            }
        } catch (error) {
            console.error("Error loading AI skills:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (e) => {
        // Предотвращаем любое всплытие события
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        setGenerating(true);
        try {
            // Формируем параметры
            const params = new URLSearchParams({
                student_id: studentId,
                with_ai: 'true'
            });
            
            // Добавляем только заполненные поля
            if (phone) params.append('phone', phone);
            if (email) params.append('email', email);
            if (birthDate) params.append('birth_date', birthDate);
            if (graduationYear) params.append('graduation_year', graduationYear);
            if (workExperience) params.append('work_experience', workExperience);
            if (courses) params.append('courses', courses);
            if (languages) params.append('languages', languages);
            if (skills) params.append('skills', skills);

            // Используем функцию из api.js с полным URL
            const response = await generateResumeDocx(params);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка ${response.status}: ${errorText}`);
            }
            
            // Получаем blob
            const blob = await response.blob();
            
            // Создаем ссылку для скачивания
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            // Получаем имя файла
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `Резюме_${studentName || 'Студент'}.docx`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match && match[1]) {
                    filename = match[1].replace(/['"]/g, '');
                }
            }
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            
            // Очищаем
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
            }, 100);
            
            // Закрываем модальное окно и сбрасываем форму
            setVisible(false);
            setTimeout(() => {
                setPhone("");
                setEmail("");
                setBirthDate("");
                setGraduationYear("");
                setWorkExperience("");
                setCourses("");
                setLanguages("");
                setSkills("");
                setShowAiSkills(false);
            }, 300);
            
        } catch (error) {
            console.error("Error generating resume:", error);
            alert("Ошибка генерации резюме: " + error.message);
        } finally {
            setGenerating(false);
        }
    };

    const useAiSkills = () => {
        if (aiSkills) {
            setSkills(aiSkills.join(", "));
            setShowAiSkills(true);
        }
    };

    return (
        <ModalWindow
            title={`Конструктор резюме — ${studentName || "Студент"}`}
            visible={visible}
            setVisible={setVisible}
        >
            <ModalBody>
                <div className="ResumeBuilderModal">
                    <div className="builder-grid">
                        {/* Левая колонка - узкая */}
                        <div className="left-column">
                            <h4>Контакты</h4>
                            <div className="field-group">
                                <label>Телефон</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+7 (XXX) XXX-XX-XX"
                                />
                            </div>
                            <div className="field-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="field-group">
                                <label>Дата рождения</label>
                                <input
                                    type="text"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    placeholder="дд.мм.гггг"
                                />
                            </div>

                            <h4>Навыки</h4>
                            <div className="field-group skills-group">
                                <label>Ключевые навыки</label>
                                <textarea
                                    value={skills}
                                    onChange={(e) => setSkills(e.target.value)}
                                    placeholder="Введите навыки через запятую"
                                    rows={3}
                                />
                                {loading ? (
                                    <span className="ai-loading">Загрузка AI-навыков...</span>
                                ) : aiSkills && !showAiSkills && (
                                    <Button
                                        text="✨ Использовать AI-навыки"
                                        onClick={useAiSkills}
                                        palette={STUDENT_PALETTE.BLUE}
                                    />
                                )}
                                {showAiSkills && (
                                    <span className="ai-badge">✅ Навыки на основе диагностики</span>
                                )}
                            </div>

                            <h4>Языки</h4>
                            <div className="field-group">
                                <label>Владение языками</label>
                                <input
                                    type="text"
                                    value={languages}
                                    onChange={(e) => setLanguages(e.target.value)}
                                    placeholder="Русский (родной), Английский (B2)"
                                />
                            </div>
                        </div>

                        {/* Правая колонка - широкая */}
                        <div className="right-column">
                            <h4>Образование</h4>
                            <div className="field-group">
                                <label>Год окончания</label>
                                <input
                                    type="text"
                                    value={graduationYear}
                                    onChange={(e) => setGraduationYear(e.target.value)}
                                    placeholder="2025"
                                />
                            </div>

                            <h4>Опыт работы</h4>
                            <div className="field-group">
                                <label>Опыт работы</label>
                                <textarea
                                    value={workExperience}
                                    onChange={(e) => setWorkExperience(e.target.value)}
                                    placeholder="Название компании — Должность (гггг-гггг)"
                                    rows={4}
                                />
                            </div>

                            <h4>Курсы</h4>
                            <div className="field-group">
                                <label>Дополнительные курсы</label>
                                <textarea
                                    value={courses}
                                    onChange={(e) => setCourses(e.target.value)}
                                    placeholder="Название курса — Организация (год)"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="preview-note">
                        <span>📄 Резюме будет сгенерировано в формате DOCX</span>
                    </div>
                </div>
            </ModalBody>

            <ModalFooter>
                <Button
                    text="Отмена"
                    onClick={() => {
                        setVisible(false);
                        setSkills("");
                        setShowAiSkills(false);
                    }}
                    palette={STUDENT_PALETTE.GRAY}
                />
                <Button
                    text={generating ? "Генерация..." : "Создать резюме"}
                    onClick={handleGenerate}
                    disabled={generating}
                    palette={STUDENT_PALETTE.GREEN}
                />
            </ModalFooter>
        </ModalWindow>
    );
}

export default ResumeBuilderModal;
