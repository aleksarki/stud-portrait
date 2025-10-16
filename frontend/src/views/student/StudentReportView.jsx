import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { portraitGetResults } from "../../api";

import Header from "../../components/Header";
import RadarChart from "../../components/RadarChart";

import "./StudentReportView.scss";

function StudentReportView() {
    const {studentId} = useParams();
    const [studResults, setStudResults] = useState();
    const [loading, setLoading] = useState(true);
    // const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // setError(null);
                await portraitGetResults(studentId, setStudResults);
            } catch (err) {
                // setError(err.message);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (studentId) {
            fetchData();
        }
    }, [studentId]);

    let content = null;
    if (studResults) {
        const res = studResults.results[0];

        const extractResults = rawData => {
            const categories = [];
            const data = [];
            for (var key in rawData) {
                if (rawData[key]) {
                    categories.push(key);
                    data.push(rawData[key]);
                }
            }
            return [categories, data];
        };

        const [uniCategories, uniData] = extractResults({
            "Коммуникативность": res.res_uni_communication,
            "Комплексное мышление": res.res_uni_complex_thinking,
            "Работа в команде": res.res_uni_command_work,
            "Методичность": res.res_uni_methodicalness,
            "Подверженность стрессу": res.res_uni_stress_susceptib,
            "Амбициозность": res.res_uni_ambitousness,
            "Следование правилам": res.res_uni_rules_compliance
        });

        const [motCategories, motData] = extractResults({
            "Смысл": res.res_mot_purpose,
            "Сотрудничество": res.res_mot_cooperation,
            "Креативность": res.res_mot_creativity,
            "Вызов": res.res_mot_challenge,
            "Автономия": res.res_mot_autonomy,
            "Саморазвитие": res.res_mot_self_develop,
            "Признание": res.res_mot_recognition,
            "Карьера": res.res_mot_career,
            "Управление": res.res_mot_management,
            "Альтруизм": res.res_mot_altruism,
            "Отношения": res.res_mot_relationship,
            "Принадлежность": res.res_mot_affiliation,
            "Традиция": res.res_mot_tradition,
            "Здоровье": res.res_mot_health,
            "Стабильность": res.res_mot_stability,
            "Заработок": res.res_mot_salary,
        });

        const [compCategories, compData] = extractResults({
            "Анализ числовой информации": res.res_comp_digital_analysis,
            "Анализ вербальной информации": res.res_comp_verbal_analysis
        });

        const [vitaCategories, vitaData] = extractResults({
            "Положительное отношение к себе": res.res_vita_positive_self_attit,
            "Отношение к будущему": res.res_vita_attit_twrd_future,
            "Организованность": res.res_vita_organization,
            "Настойчивость": res.res_vita_persistence,
        });

        const [leadCategories, leadData] = extractResults({
            "Осознанность": res.res_lead_awareness,
            "Проактивность": res.res_lead_proactivity,
            "Работа с командой": res.res_lead_command_work,
            "Контроль": res.res_lead_control,
            "Социальная ответственность": res.res_lead_social_responsib
        });

        const [profCategories, profData] = extractResults({
            "Анализ информации": res.res_prof_information_analysis,
            "Ориентация на результат": res.res_prof_result_orientation,
            "Планирование": res.res_prof_planning,
            "Стрессоустойчивость": res.res_prof_stress_resistance,
            "Партнёрство": res.res_prof_partnership,
            "Следование правилам": res.res_prof_rules_compliance,
            "Саморазвитие": res.res_prof_self_development,
            "Коммуникация": res.r
        });

        content = <>
            <div className="page-title">
                <span>Результаты студента {studResults.student.stud_name}</span>
            </div>
            <div className="report-area">
                {uniData.length !== 0 && <RadarChart
                    title="Универсальный личностный опросник"
                    seriesLabel={res.res_year}
                    seriesData={uniData}
                    categories={uniCategories}
                />}
            </div>
            <div className="report-area">
                {motData.length !== 0 && <RadarChart
                    title="Мотивационно-ценностный профиль"
                    seriesLabel={res.res_year}
                    seriesData={motData}
                    categories={motCategories}
                />}
            </div>
            <div>
                {compData.length !== 0 && <RadarChart
                    title="Компетенции"
                    seriesLabel={res.res_year}
                    seriesData={compData}
                    categories={compCategories}
                />}
            </div>
            <div>
                {vitaData.length !== 0 && <RadarChart
                    title="Жизнестойкость"
                    seriesLabel={res.res_year}
                    seriesData={vitaData}
                    categories={vitaCategories}
                />}
            </div>
            <div>
                {leadData.length !== 0 && <RadarChart
                    title="Ценостные установки лидера"
                    seriesLabel={res.res_year}
                    seriesData={leadData}
                    categories={leadCategories}
                />}
            </div>
            <div>
                {profData.length !== 0 && <RadarChart
                    title="Индивидуальный профиль"
                    seriesLabel={res.res_year}
                    seriesData={profData}
                    categories={profCategories}
                />}
            </div>
        </>;
    }

    return (
        <div className="StudentReportView">
            <Header />
            {content}
        </div>
    );
}

export default StudentReportView;
