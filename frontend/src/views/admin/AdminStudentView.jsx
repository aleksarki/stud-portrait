import { useState, useEffect } from 'react';

import { LINK_TREE } from '../../utilities';
import { getStudentsList, getStudentPortrait } from '../../api';

import { ToastContainer, toast } from 'react-toastify';
import FlexColumn from '../../components/FlexColumn';
import FlexRow from '../../components/FlexRow';
import LabelledBox from '../../components/LabelledBox';
import { SidebarLayout, LAYOUT_STYLE, Header, Sidebar, Content } from '../../components/SidebarLayout';

import Table, { TableHeader, TableItem, TableRow } from '../../components/tables/Table';

import { COMPETENCIES_NAMES, VALUES_NAMES, MOTIVATORS_NAMES } from '../../utilities.js';
import Label, { LABEL_PALETTE } from '../../components/ui/Label';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

import './AdminStudentView.scss';

// Компонент поиска студента
const StudentSearch = ({ onSelectStudent }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    useEffect(() => {
        if (searchTerm.length >= 2) {
            searchStudents();
        } else if (searchTerm.length === 0) {
            setStudents([]);
        }
    }, [searchTerm]);

    const searchStudents = async () => {
        setLoading(true);
        getStudentsList(searchTerm, 20)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setStudents(data.data);
                }
            })
            .onError(error => console.error('Ошибка поиска:', error))
            .finally(() => setLoading(false));
    };

    const handleSelectStudent = student => {
        setSelectedStudentId(student.id);
        setSearchTerm(student.rsv_id);
        onSelectStudent(student.id);
        setStudents([]);
    };

    return (
        <div className="student-search">
            <Label
                text="Поиск студента:"
                palette={LABEL_PALETTE.BLUE}
            />
            <div className="search-container">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Введите ID студента, ФИО или название вуза..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                {loading && <LoadingSpinner small />}
                {students.length > 0 && (
                    <div className="search-results">
                        {students.map(student => (
                            <div
                                key={student.id}
                                className={`search-result-item ${selectedStudentId === student.id ? 'selected' : ''}`}
                                onClick={() => handleSelectStudent(student)}
                            >
                                <div className="result-rsv">{student.rsv_id}</div>
                                <div className="result-info">
                                    {student.institution} • {student.specialty} • {student.course} курс
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Компонент информации о студенте
const StudentInfoCard = ({ student }) => {
    if (!student) return null;

    return (
        <LabelledBox label="📋 Основная информация">
            <div className="info-grid">
                <div className="info-item">
                    <span className="info-label">ID студента:</span>
                    <span className="info-value">{student.rsv_id}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Пол:</span>
                    <span className="info-value">{student.gender}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Учебное заведение:</span>
                    <span className="info-value">{student.institution}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Уровень образования:</span>
                    <span className="info-value">{student.edu_level}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Форма обучения:</span>
                    <span className="info-value">{student.study_form}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Направление подготовки:</span>
                    <span className="info-value">{student.specialty}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Текущий курс:</span>
                    <span className="info-value">{student.current_course}</span>
                </div>
            </div>
        </LabelledBox>
    );
};

// Компонент результатов тестирования
const TestResultsCard = ({ Results }) => {
    const [selectedYear, setSelectedYear] = useState(null);

    useEffect(() => {
        if (!selectedYear && Results && Results.length > 0 && Results[0]?.year) {
            setSelectedYear(Results[0].year);
        }
    }, [Results, selectedYear]);

    if (!Results || Results.length === 0) {
        return (
            <LabelledBox label="📊 Результаты тестирования">
                <div className="no-data">Нет данных о тестировании</div>
            </LabelledBox>
        );
    }

    const currentResult = Results.find(r => r.year === selectedYear);

    // Определение уровня для компетенций
    const getScoreLevel = score => {
        if (score === null || score === undefined) return { level: 'Нет данных', color: '#ccc' };
        if (score >= 600) return { level: 'Высокий', color: '#4caf50' };
        if (score >= 400) return { level: 'Средний', color: '#ffc107' };
        return { level: 'Начальный', color: '#f44336' };
    };

    // Определение уровня для мотиваторов
    const getMotivatorLevel = score => {
        if (score === null || score === undefined) return { level: 'Нет данных', color: '#ccc' };
        if (score >= 600) return { level: 'Мотиватор', color: '#4caf50' };
        if (score >= 400) return { level: 'Не проявлено', color: '#ffc107' };
        return { level: 'Демотиватор', color: '#f44336' };
    };

    return (
        <LabelledBox label="📊 Результаты тестирования">
            <div className="test-years">
                {Results.map(result => (
                    <button
                        key={result.year}
                        className={`year-btn ${selectedYear === result.year ? 'active' : ''}`}
                        onClick={() => setSelectedYear(result.year)}
                    >
                        {result.year}
                    </button>
                ))}
            </div>

            {currentResult && (
                <>
                    <div className="test-info">
                        <div className="test-meta">
                            <span>Курс: {currentResult.course_num}</span>
                            {currentResult.center && <span>ЦК: {currentResult.center}</span>}
                            {currentResult.high_potential && (
                                <span className={`high-potential ${currentResult.high_potential === 'Да' ? 'yes' : 'no'}`}>
                                    Высокий потенциал: {currentResult.high_potential}
                                </span>
                            )}
                        </div>
                    </div>

                    <h4>Компетенции</h4>
                    <div className="scores-grid">
                        {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => {
                            const score = currentResult.competencies[key];
                            const level = getScoreLevel(score);
                            return (
                                <div
                                    key={key}
                                    className="score-item"
                                >
                                    <div className="score-name">{name}</div>
                                    <div
                                        className="score-value"
                                        style={{ color: level.color }}
                                    >
                                        {score !== null ? score : '—'}
                                    </div>
                                    <div
                                        className="score-level"
                                        style={{ backgroundColor: level.color }}
                                    >
                                        {level.level}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <h4>Мотиваторы</h4>
                    <div className="scores-grid motivators">
                        {Object.entries(MOTIVATORS_NAMES).map(([key, name]) => {
                            const score = currentResult.motivators[key];
                            const level = getMotivatorLevel(score);
                            return (
                                <div
                                    key={key}
                                    className="score-item"
                                >
                                    <div className="score-name">{name}</div>
                                    <div
                                        className="score-value"
                                        style={{ color: level.color }}
                                    >
                                        {score !== null ? score : '—'}
                                    </div>
                                    <div
                                        className="score-level"
                                        style={{ backgroundColor: level.color }}
                                    >
                                        {level.level}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <h4>Ценности</h4>
                    <div className="scores-grid values">
                        {Object.entries(VALUES_NAMES).map(([key, name]) => {
                            const score = currentResult.values[key];
                            return (
                                <div
                                    key={key}
                                    className="score-item"
                                >
                                    <div className="score-name">{name}</div>
                                    <div className="score-value">{score !== null ? score : '—'}</div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </LabelledBox>
    );
};

// Компонент оценок по дисциплинам
const AcademicPerformanceCard = ({ grades }) => {
    if (!grades || grades.length === 0) {
        return (
            <LabelledBox label="📚 Оценки по дисциплинам">
                <div className="no-data">Нет данных об успеваемости</div>
            </LabelledBox>
        );
    }

    const groupedByYear = {};
    grades.forEach(grade => {
        if (!groupedByYear[grade.year]) groupedByYear[grade.year] = [];
        groupedByYear[grade.year].push(grade);
    });

    return (
        <LabelledBox label="📚 Оценки по дисциплинам">
            {Object.entries(groupedByYear).map(([year, yearGrades]) => (
                <div
                    key={year}
                    className="grades-year"
                >
                    <h4>{year}</h4>
                    <Table>
                        <TableHeader>
                            <TableItem>Дисциплина</TableItem>
                            <TableItem>Оценка</TableItem>
                        </TableHeader>
                        {yearGrades.map((grade, idx) => (
                            <TableRow key={idx}>
                                <TableItem>{grade.discipline}</TableItem>
                                <TableItem>{grade.main_attestation || '—'}</TableItem>
                            </TableRow>
                        ))}
                    </Table>
                </div>
            ))}
        </LabelledBox>
    );
};

// Компонент пройденных курсов
const CoursesCard = ({ courses }) => {
    if (!courses || courses.length === 0) {
        return (
            <LabelledBox label="🎓 Пройденные образовательные курсы">
                <div className="no-data">Нет данных о пройденных курсах</div>
            </LabelledBox>
        );
    }

    // Курсы и их названия
    const courseFields = [
        { key: 'an_dec', name: 'Анализ и принятие решений' },
        { key: 'client_focus', name: 'Клиентоориентированность' },
        { key: 'communication', name: 'Коммуникация' },
        { key: 'leadership', name: 'Лидерство' },
        { key: 'result_orientation', name: 'Ориентация на результат' },
        { key: 'planning_org', name: 'Планирование и организация' },
        { key: 'rules_culture', name: 'Правила и культура' },
        { key: 'self_dev', name: 'Саморазвитие' },
        { key: 'collaboration', name: 'Сотрудничество' },
        { key: 'stress_resistance', name: 'Стрессоустойчивость' },
        { key: 'emotions_communication', name: 'Эмоции в коммуникации' },
        { key: 'negotiations', name: 'Переговоры' },
        { key: 'digital_comm', name: 'Цифровая коммуникация' },
        { key: 'effective_learning', name: 'Эффективное обучение' },
        { key: 'entrepreneurship', name: 'Предпринимательство' },
        { key: 'creativity_tech', name: 'Креативные технологии' },
        { key: 'trendwatching', name: 'Трендвотчинг' },
        { key: 'conflict_management', name: 'Управление конфликтами' },
        { key: 'career_management', name: 'Управление карьерой' },
        { key: 'burnout', name: 'Профессиональное выгорание' },
        { key: 'cross_cultural_comm', name: 'Кросс-культурная коммуникация' },
        { key: 'mentoring', name: 'Наставничество' }
    ];

    return (
        <LabelledBox label="🎓 Пройденные образовательные курсы">
            {courses.map((course, idx) => (
                <div
                    key={idx}
                    className="course-item"
                >
                    <h4>Курс {idx + 1}</h4>
                    <div className="course-scores">
                        {courseFields.map(field => {
                            const value = course[field.key];
                            if (value !== null && value !== undefined) {
                                return (
                                    <div
                                        key={field.key}
                                        className="course-score"
                                    >
                                        <span className="course-score-label">{field.name}:</span>
                                        <span className="course-score-value">{value}</span>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            ))}
        </LabelledBox>
    );
};

function AdminStudentView() {
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [studentPortrait, setStudentPortrait] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedStudentId) {
            loadStudentPortrait(selectedStudentId);
        } else {
            setStudentPortrait(null);
        }
    }, [selectedStudentId]);

    const loadStudentPortrait = async studentId => {
        setLoading(true);
        getStudentPortrait(studentId)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setStudentPortrait(data.data);
                } else {
                    console.error('Ошибка загрузки портрета:', data.message);
                    toast.error('Ошибка при загрузке портрета');
                }
            })
            .onError(error => {
                console.error('Ошибка:', error);
                toast.error('Ошибка при загрузке портрета');
            })
            .finally(() => setLoading(false));
    };

    return (
        <div className="AdminStudentView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header
                    title="Админ: Просмотр студента"
                    name="Администратор1"
                />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>Цифровой портрет студента</h2>

                    <StudentSearch onSelectStudent={setSelectedStudentId} />

                    {loading && <LoadingSpinner text="Загрузка портрета студента..." />}

                    {!loading && studentPortrait && (
                        <FlexColumn gap="24">
                            <StudentInfoCard student={studentPortrait.student_info} />
                            <TestResultsCard Results={studentPortrait.test_results} />
                            <AcademicPerformanceCard grades={studentPortrait.academic_performance} />
                            <CoursesCard courses={studentPortrait.courses} />
                        </FlexColumn>
                    )}

                    {!loading && !studentPortrait && selectedStudentId && (
                        <div className="no-data-large">Не удалось загрузить данные студента</div>
                    )}
                </Content>
            </SidebarLayout>
            <ToastContainer
                position="bottom-right"
                autoClose={2000}
                hideProgressBar={true}
                newestOnTop={false}
                closeOnClick={true}
                rtl={false}
                theme="light"
            />
        </div>
    );
}

export default AdminStudentView;
