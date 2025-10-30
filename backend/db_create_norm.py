import random

NUM_STUDENTS = 1000
START_YEARS = range(2021, 2024)  # Годы начала учёбы

programs_base = {
    "Математическое":     {'mean': 500, 'sigma': 50},
    "Гуманитарное":       {'mean': 400, 'sigma': 60},
    "Экономическое":      {'mean': 450, 'sigma': 40},
    "Техническое":        {'mean': 480, 'sigma': 45},
    "Естественнонаучное": {'mean': 470, 'sigma': 55}
}
programs_list = list(programs_base.keys())

institutions = "Университет №1", "Университет №2", "Университет №3", "Университет №4"

institution_multipliers = {}
for institution in institutions:
    institution_multipliers[institution] = random.uniform(.7, 1.3)

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
    'res_prof_communication',
    
    'res_val_honesty_justice',
    'res_val_humanism', 
    'res_val_patriotism',
    'res_val_family',
    'res_val_health',
    'res_val_environment'
]
competence_base_means = {}
for field in fields:
    competence_base_means[field] = random.randint(200, 500)

def generate_normal_value(mean, std_dev):
    """Генерирует значение по нормальному распределению."""
    return max(200, min(800, int(random.gauss(mean, std_dev))))  # Ограничение от 0 до 1000

with open('synthetic_fill_database.sql', 'w', encoding='utf-8') as f:
    # Сначала создаем записи в Institutions
    f.write("-- Заполнение учебных заведений\n")
    for i, institution_name in enumerate(institutions, 1):
        f.write(f"INSERT INTO Institutions (inst_name) VALUES ('{institution_name}');\n")
    
    # Создаем записи в Programs
    f.write("\n-- Заполнение направлений\n")
    for i, program_name in enumerate(programs_list, 1):
        f.write(f"INSERT INTO Programs (prog_name) VALUES ('{program_name}');\n")
    
    # Таблица Students
    f.write("\n-- Заполнение студентов\n")
    students = []
    for i in range(NUM_STUDENTS):
        start_year = random.choice(START_YEARS)
        institution_name = random.choice(institutions)
        program_name = random.choice(programs_list)
        student_name = f"Студент {i+1}"
        
        # Определяем ID учреждения и программы (начиная с 1)
        institution_id = institutions.index(institution_name) + 1
        program_id = programs_list.index(program_name) + 1
            
        f.write(
            "INSERT INTO Students (stud_name, stud_enter_year, stud_program, stud_institution) "
            f"VALUES ('{student_name}', {start_year}, {program_id}, {institution_id});\n"
        )
        students.append((i+1, start_year, program_name, institution_name, program_id, institution_id))

    # Таблица Results
    f.write("\n-- Заполнение результатов\n")
    for student_id, start_year, program_name, institution_name, program_id, institution_id in students:
        # Генерируем данные для каждого года обучения (максимум 4 года)
        for year_offset in range(4):  # 0, 1, 2, 3 - соответствует 1, 2, 3, 4 курсу
            current_year = start_year + year_offset
            if current_year > 2025:  # Не генерируем данные за будущие годы
                continue
                
            course = year_offset + 1  # Текущий курс (1-4)
            
            # Комбинированная динамика матожидания: по годам и по курсам
            # Базовое матожидание для направления + влияние курса + влияние года
            base_mean = programs_base[program_name]['mean']
            base_sigma = programs_base[program_name]['sigma']
            
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
                program_variation = random.uniform(0.9, 1.1)
                
                # Добавляем влияние университета
                institution_multiplier = institution_multipliers[institution_name]
                
                # Комбинируем все множители
                final_mean = competence_mean * program_variation * institution_multiplier
                
                value = generate_normal_value(final_mean, base_sigma)
                values.append(str(value))
            
            values_str = ', '.join(values)
            f.write(
                f"INSERT INTO Results (res_stud, res_year, {', '.join(fields)}) "
                f"VALUES ({student_id}, {current_year}, {values_str});\n"
            )

print("Множители учебных заведений:")
for institution, multiplier in institution_multipliers.items():
    print(f"{institution}: {multiplier:.2f}")

print("\nБазовые настройки направлений:")
for program, settings in programs_base.items():
    print(f"{program}: mean={settings['mean']}, sigma={settings['sigma']}")

print(f"\nСгенерировано {NUM_STUDENTS} студентов.")
print("Файл synthetic_fill_database.sql успешно создан.")
