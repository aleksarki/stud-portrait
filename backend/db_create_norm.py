import random
from math import sqrt

# Настройки для нормальных распределений
mu_base = {
    'математическое': {'mean': 400, 'sigma': 50},
    'гуманитарное': {'mean': 300, 'sigma': 60},
    'экономическое': {'mean': 350, 'sigma': 40}
}

universities = ['Университет №1', 'Университет №2']
directions = list(mu_base.keys())

# Количество студентов
num_students = 10
start_years = range(2021, 2024)  # Годы начала учёбы
fields = [
    'res_uni_communication',
    'res_uni_complex_thinking',
    'res_uni_command_work',
    'res_uni_methodicalness',
    'res_uni_stress_susceptib',
    'res_uni_ambitousness',
    'res_uni_rules_compliance',

    'res_mot_purpose',
    'res_mot_cooperation',
    'res_mot_creativity',
    'res_mot_challenge',
    'res_mot_autonomy',
    'res_mot_self_development',
    'res_mot_recognition',
    'res_mot_career',
    'res_mot_management',
    'res_mot_altruism',
    'res_mot_relationships',
    'res_mot_affiliation',
    'res_mot_tradition',
    'res_mot_health',
    'res_mot_stability',
    'res_mot_salary',

    'res_comp_digital_analysis',
    'res_comp_verbal_analysis',

    'res_vita_positive_self_attit',
    'res_vita_attit_twrd_future',
    'res_vita_organization',
    'res_vita_persistence',

    'res_lead_awareness',
    'res_lead_proactivity',
    'res_lead_command_work',
    'res_lead_control',
    'res_lead_social_responsib',

    'res_prof_information_analysis',
    'res_prof_result_orientation',
    'res_prof_planning',
    'res_prof_stress_resistance',
    'res_prof_partnership',
    'res_prof_rules_compliance',
    'res_prof_self_development',
    'res_prof_communication'
]

def generate_normal_value(mean, std_dev):
    """Генерирует значение по нормальному распределению."""
    return int(random.gauss(mean, std_dev))

with open('synthetic_data.sql', 'w') as f:
    # Таблица Students
    students = []
    for i in range(num_students):
        start_year = random.choice(start_years)
        university = random.choice(universities)
        direction = random.choice(directions)
        student_name = f'Студент {i+1}'
        course = 2025 - start_year + 1 if 2025 >= start_year else None
        insert_student_sql = f"INSERT INTO Students (stud_name, stud_start_year, stud_course, stud_direction, stud_university) VALUES ('{student_name}', '{start_year}', {course or 'NULL'}, '{direction}', '{university}');\n"
        f.write(insert_student_sql)
        students.append((i+1, start_year))  # Сохраняем ID и год поступления студента

    # Таблица Results
    for student_id, start_year in students:
        current_year = start_year
        while current_year <= 2025 and current_year <= start_year + 3:  # Не больше четырёх лет
            mu_current = mu_base[students[i][2]]['mean'] * (current_year - start_year + 1) / 4  # Увеличение среднего по годам
            std_dev = mu_base[students[i][2]]['sigma']
            values = ', '.join(str(generate_normal_value(mu_current, std_dev)) for _ in fields)
            insert_results_sql = f"""
INSERT INTO Results (res_stud, res_year, {', '.join(fields)}) VALUES ({student_id}, {current_year}, {values});
\n"""
            f.write(insert_results_sql)
            current_year += 1

print("Файл synthetic_data.sql успешно создан.")