import random

# Количество студентов
num_students = 10
years = range(2021, 2024)  # Диапазон лет для каждой записи

def generate_random_value():
    return random.randint(200, 800)

with open('synthetic_data.sql', 'w') as f:
    
    # Заполняем таблицу Students
    for i in range(num_students):
        student_name = f'Студент {i+1}'
        insert_student_sql = f"INSERT INTO Students (stud_name) VALUES ('{student_name}');\n"
        f.write(insert_student_sql)
        
    # Заполняем таблицу Results
    for student_id in range(1, num_students + 1):  # Нумерация начинается с 1
        for year in years:
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
            
            values = ', '.join(str(generate_random_value()) for _ in fields)
            
            insert_results_sql = f"""
INSERT INTO Results (res_stud, res_year, {', '.join(fields)}) VALUES ({student_id}, {year}, {values});
\n"""
            f.write(insert_results_sql)

print("Файл synthetic_data.sql успешно создан.")