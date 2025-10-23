import random
from math import sqrt

# Настройки для нормальных распределений по направлениям и университетам
mu_base = {
    'Математическое': {'mean': 400, 'sigma': 50},
    'Гуманитарное': {'mean': 300, 'sigma': 60},
    'Экономическое': {'mean': 350, 'sigma': 40}
}

universities = ['Университет №1', 'Университет №2', 'Университет №3']
directions = list(mu_base.keys())

# Добавляем множители для университетов (случайные отклонения от базового уровня)
university_multipliers = {}
for university in universities:
    # Случайный множитель от 0.8 до 1.2 для каждого университета
    university_multipliers[university] = random.uniform(0.8, 1.2)

# Количество студентов
num_students = 1000
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
    return max(0, int(random.gauss(mean, std_dev)))  # Добавлено ограничение снизу

# Создаем случайные базовые матожидания для разных компетенций
competence_base_means = {}
for field in fields:
    # Случайное базовое матожидание от 200 до 500 для разных компетенций
    competence_base_means[field] = random.randint(200, 500)

with open('synthetic_fill_database.sql', 'w', encoding='utf-8') as f:
    # Таблица Students
    students = []
    for i in range(num_students):
        start_year = random.choice(start_years)
        university = random.choice(universities)
        direction = random.choice(directions)
        student_name = f'Студент {i+1}'
        
        # Определяем курс для 2025 года (или NULL если уже выпустился)
        if 2025 >= start_year:
            course = min(4, 2025 - start_year + 1)  # Максимум 4 курс
        else:
            course = None
            
        f.write(
            "INSERT INTO Students (stud_name, stud_enter_year, stud_major, stud_edu_instit) "
            f"VALUES ('{student_name}', {start_year}, '{direction}', '{university}');\n"
        )
        students.append((i+1, start_year, direction, university))  # Сохраняем ID, год поступления, направление и вуз

    # Таблица Results
    for student_id, start_year, direction, university in students:
        # Генерируем данные для каждого года обучения (максимум 4 года)
        for year_offset in range(4):  # 0, 1, 2, 3 - соответствует 1, 2, 3, 4 курсу
            current_year = start_year + year_offset
            if current_year > 2025:  # Не генерируем данные за будущие годы
                continue
                
            course = year_offset + 1  # Текущий курс (1-4)
            
            # Комбинированная динамика матожидания: по годам и по курсам
            # Базовое матожидание для направления + влияние курса + влияние года
            base_mean = mu_base[direction]['mean']
            base_sigma = mu_base[direction]['sigma']
            
            # Увеличение матожидания с курсом (курс 1-4)
            course_multiplier = 0.8 + (course * 0.1)  # 0.9, 1.0, 1.1, 1.2
            
            # Увеличение матожидания с годами (2021-2025)
            year_multiplier = 0.9 + ((current_year - 2021) * 0.05)  # 0.9, 0.95, 1.0, 1.05, 1.1
            
            combined_multiplier = (course_multiplier + year_multiplier) / 2
            
            values = []
            for field in fields:
                # Учитываем базовое матожидание для компетенции и комбинированную динамику
                competence_mean = competence_base_means[field] * combined_multiplier
                
                # Добавляем случайное отклонение между направлениями (±10%)
                direction_variation = random.uniform(0.9, 1.1)
                
                # Добавляем влияние университета
                university_multiplier = university_multipliers[university]
                
                # Комбинируем все множители
                final_mean = competence_mean * direction_variation * university_multiplier
                
                value = generate_normal_value(final_mean, base_sigma)
                values.append(str(value))
            
            values_str = ', '.join(values)
            f.write(
                f"INSERT INTO Results (res_stud, res_year, {', '.join(fields)}) "
                f"VALUES ({student_id}, {current_year}, {values_str});\n"
            )

# Выводим информацию о множителях университетов для отладки
print("Множители университетов:")
for university, multiplier in university_multipliers.items():
    print(f"{university}: {multiplier:.2f}")

print("Файл synthetic_fill_database.sql успешно создан.")
