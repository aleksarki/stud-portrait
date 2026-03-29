# Модуль анализа данных.


import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LinearRegression, HuberRegressor
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

from .common import *

# ============================================================
# VALUE-ADDED MODEL (VAM) - Персональный анализ студента
# ============================================================

class ValueAddedModel:
    """
    Value-Added Model для оценки прогресса студента.
    
    Измеряет, насколько результат студента отличается от ожидаемого
    на основе его предыдущих показателей и контрольных переменных.
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.baseline_mean = None
        self.baseline_std = None
    
    def fit_for_student(self, student_data):
        """
        Обучает модель на данных конкретного студента.
        
        Args:
            student_data: DataFrame с колонками [year, course, competency_score]
        
        Returns:
            dict: Результаты анализа для студента
        """
        if len(student_data) < 2:
            return {
                'status': 'insufficient_data',
                'message': 'Недостаточно данных для анализа (нужно минимум 2 замера)'
            }
        
        # Сортируем по году/курсу
        student_data = student_data.sort_values(['year', 'course'])
        
        # Вычисляем прирост компетенции
        student_data['prev_score'] = student_data['competency_score'].shift(1)
        student_data['actual_growth'] = student_data['competency_score'] - student_data['prev_score']
        
        # Убираем первую запись (нет предыдущего балла)
        growth_data = student_data[student_data['prev_score'].notna()].copy()
        
        if len(growth_data) == 0:
            return {
                'status': 'insufficient_data',
                'message': 'Недостаточно данных для расчёта прироста'
            }
        
        # Ожидаемый прирост (baseline)
        expected_growth = growth_data['prev_score'].mean() * 0.05  # 5% рост
        
        # Value-Added = фактический прирост - ожидаемый прирост
        growth_data['value_added'] = growth_data['actual_growth'] - expected_growth
        
        # Статистика
        avg_value_added = growth_data['value_added'].mean()
        std_value_added = growth_data['value_added'].std()
        
        # Классификация студента
        if avg_value_added > 0.5 * std_value_added:
            performance = 'above_expected'
            performance_label = 'Выше ожидаемого'
        elif avg_value_added < -0.5 * std_value_added:
            performance = 'below_expected'
            performance_label = 'Ниже ожидаемого'
        else:
            performance = 'as_expected'
            performance_label = 'Соответствует ожиданиям'
        
        return {
            'status': 'success',
            'measurements': len(growth_data),
            'average_value_added': float(avg_value_added),
            'total_growth': float(growth_data['actual_growth'].sum()),
            'expected_growth': float(expected_growth * len(growth_data)),
            'performance': performance,
            'performance_label': performance_label,
            'growth_by_period': growth_data[['year', 'course', 'actual_growth', 'value_added']].to_dict('records')
        }
    
    def fit_cohort(self, cohort_data, control_variables=None):
        """
        Обучает VAM на когорте студентов.
        
        Args:
            cohort_data: DataFrame с данными студентов
            control_variables: Список контрольных переменных
        
        Returns:
            dict: Результаты анализа когорты
        """
        # Группируем по студентам
        student_groups = cohort_data.groupby('student_id')
        
        results = []
        for student_id, student_df in student_groups:
            student_result = self.fit_for_student(student_df)
            if student_result['status'] == 'success':
                student_result['student_id'] = student_id
                results.append(student_result)
        
        if not results:
            return {
                'status': 'error',
                'message': 'Нет студентов с достаточными данными'
            }
        
        # Агрегированная статистика
        avg_values = [r['average_value_added'] for r in results]
        
        return {
            'status': 'success',
            'total_students': len(results),
            'avg_value_added': float(np.mean(avg_values)),
            'std_value_added': float(np.std(avg_values)),
            'median_value_added': float(np.median(avg_values)),
            'students': results
        }


# ============================================================
# LATENT GROWTH MODEL (LGM) - Траектории развития
# ============================================================

class LatentGrowthModel:
    """
    Latent Growth Model для анализа траекторий развития компетенций.
    
    Моделирует индивидуальные траектории роста с учётом:
    - Начального уровня (intercept)
    - Скорости роста (slope)
    - Нелинейных эффектов (quadratic)
    """
    
    def __init__(self):
        self.intercept_model = None
        self.slope_model = None
        self.fitted = False
    
    def fit(self, longitudinal_data):
        """
        Обучает LGM на лонгитюдных данных.
        
        Args:
            longitudinal_data: DataFrame с колонками [student_id, time_point, competency_score]
        
        Returns:
            dict: Параметры модели
        """
        # Группируем по студентам
        student_trajectories = []
        
        for student_id, student_df in longitudinal_data.groupby('student_id'):
            if len(student_df) < 2:
                continue
            
            student_df = student_df.sort_values('time_point')
            
            # Извлекаем временные точки и баллы
            time = student_df['time_point'].values
            scores = student_df['competency_score'].values
            
            # Подгоняем линейную модель для каждого студента
            if len(time) >= 2:
                # Центрируем время (0 = первый замер)
                time_centered = time - time[0]
                
                # Линейная регрессия: score = intercept + slope * time
                model = LinearRegression()
                model.fit(time_centered.reshape(-1, 1), scores)
                
                intercept = model.intercept_
                slope = model.coef_[0]
                
                # R² для оценки качества подгонки
                r_squared = model.score(time_centered.reshape(-1, 1), scores)
                
                student_trajectories.append({
                    'student_id': student_id,
                    'intercept': intercept,  # Начальный уровень
                    'slope': slope,          # Скорость роста
                    'r_squared': r_squared,
                    'measurements': len(scores)
                })
        
        if not student_trajectories:
            return {
                'status': 'error',
                'message': 'Недостаточно данных для LGM'
            }
        
        # Преобразуем в DataFrame
        trajectories_df = pd.DataFrame(student_trajectories)
        
        # Статистика по популяции
        self.fitted = True
        
        return {
            'status': 'success',
            'n_students': len(trajectories_df),
            'mean_intercept': float(trajectories_df['intercept'].mean()),
            'std_intercept': float(trajectories_df['intercept'].std()),
            'mean_slope': float(trajectories_df['slope'].mean()),
            'std_slope': float(trajectories_df['slope'].std()),
            'mean_r_squared': float(trajectories_df['r_squared'].mean()),
            'trajectories': trajectories_df.to_dict('records'),
            'interpretation': self._interpret_results(trajectories_df)
        }
    
    def _interpret_results(self, trajectories_df):
        """Интерпретирует результаты LGM."""
        mean_slope = trajectories_df['slope'].mean()
        std_slope = trajectories_df['slope'].std()
        
        # Классифицируем студентов
        fast_growers = trajectories_df[trajectories_df['slope'] > mean_slope + 0.5 * std_slope]
        slow_growers = trajectories_df[trajectories_df['slope'] < mean_slope - 0.5 * std_slope]
        
        return {
            'average_growth_rate': float(mean_slope),
            'growth_variability': float(std_slope),
            'fast_growers_count': len(fast_growers),
            'slow_growers_count': len(slow_growers),
            'fast_growers_pct': float(len(fast_growers) / len(trajectories_df) * 100),
            'slow_growers_pct': float(len(slow_growers) / len(trajectories_df) * 100)
        }
    
    def predict_trajectory(self, intercept, slope, time_points):
        """
        Предсказывает траекторию для заданных параметров.
        
        Args:
            intercept: Начальный уровень
            slope: Скорость роста
            time_points: Временные точки для предсказания
        
        Returns:
            np.array: Предсказанные значения
        """
        return intercept + slope * np.array(time_points)


# ============================================================
# DISCIPLINE IMPACT ANALYSIS - Влияние дисциплин на компетенции
# ============================================================

class DisciplineImpactAnalyzer:
    """
    Анализ влияния дисциплин на развитие компетенций.
    
    Использует методы:
    1. Difference-in-Differences (DiD)
    2. Paired t-test (до/после дисциплины)
    3. Effect size (Cohen's d)
    """
    
    def analyze_discipline_impact(self, discipline_data, competency_field):
        """
        Анализирует влияние дисциплины на компетенцию.
        
        Args:
            discipline_data: DataFrame с колонками [student_id, discipline, grade, year]
            competency_field: Название поля компетенции
        
        Returns:
            dict: Результаты анализа
        """
        results = []
        
        # Группируем по дисциплинам
        for discipline, disc_df in discipline_data.groupby('discipline'):
            # Анализируем каждую оценку отдельно
            grade_impacts = {}
            
            for grade in ['отл.', 'хор.', 'удовл.']:
                grade_students = disc_df[disc_df['grade'] == grade]
                
                if len(grade_students) < 5:  # Минимум 5 студентов
                    continue
                
                # Извлекаем баллы до и после дисциплины
                before_scores = grade_students[f'{competency_field}_before'].values
                after_scores = grade_students[f'{competency_field}_after'].values
                
                # Paired t-test
                t_stat, p_value = stats.ttest_rel(after_scores, before_scores)
                
                # Средний прирост
                mean_diff = after_scores.mean() - before_scores.mean()
                
                # Effect size (Cohen's d)
                std_pooled = np.sqrt((before_scores.std()**2 + after_scores.std()**2) / 2)
                cohens_d = mean_diff / std_pooled if std_pooled > 0 else 0
                
                grade_impacts[grade] = {
                    'n_students': len(grade_students),
                    'mean_before': float(before_scores.mean()),
                    'mean_after': float(after_scores.mean()),
                    'mean_gain': float(mean_diff),
                    't_statistic': float(t_stat),
                    'p_value': float(p_value),
                    'cohens_d': float(cohens_d),
                    'significant': p_value < 0.05,
                    'effect_size_label': self._interpret_effect_size(cohens_d)
                }
            
            if grade_impacts:
                results.append({
                    'discipline': discipline,
                    'competency': competency_field,
                    'grade_impacts': grade_impacts,
                    'summary': self._summarize_discipline_impact(grade_impacts)
                })
        
        return {
            'status': 'success',
            'results': results
        }
    
    def analyze_all_disciplines(self, full_data):
        """
        Анализирует влияние всех дисциплин на все компетенции.
        
        Args:
            full_data: DataFrame с полными данными
        
        Returns:
            dict: Комплексные результаты
        """
        competencies = [
            'res_comp_leadership',
            'res_comp_planning',
            'res_comp_result_orientation',
            'res_comp_info_analysis',
            'res_comp_communication'
        ]
        
        all_results = {}
        
        for comp in competencies:
            comp_results = self.analyze_discipline_impact(full_data, comp)
            all_results[comp] = comp_results
        
        # Создаём сводную матрицу влияния
        impact_matrix = self._create_impact_matrix(all_results)
        
        return {
            'status': 'success',
            'detailed_results': all_results,
            'impact_matrix': impact_matrix,
            'top_effective_disciplines': self._rank_disciplines(impact_matrix)
        }
    
    def _interpret_effect_size(self, cohens_d):
        """Интерпретирует размер эффекта (Cohen's d)."""
        abs_d = abs(cohens_d)
        
        if abs_d < 0.2:
            return 'Negligible (незначительный)'
        elif abs_d < 0.5:
            return 'Small (малый)'
        elif abs_d < 0.8:
            return 'Medium (средний)'
        else:
            return 'Large (большой)'
    
    def _summarize_discipline_impact(self, grade_impacts):
        """Создаёт сводку по влиянию дисциплины."""
        # Усредняем эффект по всем оценкам
        all_gains = [impact['mean_gain'] for impact in grade_impacts.values()]
        all_cohens_d = [impact['cohens_d'] for impact in grade_impacts.values()]
        
        avg_gain = np.mean(all_gains)
        avg_effect = np.mean(all_cohens_d)
        
        return {
            'average_gain': float(avg_gain),
            'average_effect_size': float(avg_effect),
            'effective': avg_gain > 5 and avg_effect > 0.2  # Критерии эффективности
        }
    
    def _create_impact_matrix(self, all_results):
        """Создаёт матрицу влияния дисциплин на компетенции."""
        matrix = []
        
        for comp, comp_data in all_results.items():
            if comp_data['status'] == 'success':
                for disc_result in comp_data['results']:
                    matrix.append({
                        'discipline': disc_result['discipline'],
                        'competency': comp,
                        'avg_gain': disc_result['summary']['average_gain'],
                        'effect_size': disc_result['summary']['average_effect_size'],
                        'effective': disc_result['summary']['effective']
                    })
        
        return sorted(matrix, key=lambda x: x['effect_size'], reverse=True)
    
    def _rank_disciplines(self, impact_matrix):
        """Ранжирует дисциплины по эффективности."""
        # Группируем по дисциплинам
        discipline_scores = {}
        
        for entry in impact_matrix:
            disc = entry['discipline']
            if disc not in discipline_scores:
                discipline_scores[disc] = []
            
            discipline_scores[disc].append(entry['effect_size'])
        
        # Усредняем эффект по всем компетенциям
        rankings = []
        for disc, effects in discipline_scores.items():
            rankings.append({
                'discipline': disc,
                'average_effect': float(np.mean(effects)),
                'competencies_impacted': len(effects)
            })
        
        return sorted(rankings, key=lambda x: x['average_effect'], reverse=True)


# ============================================================
# CROSS-SECTIONAL ANALYSIS - Анализ в разрезе
# ============================================================

class CrossSectionalAnalyzer:
    """
    Анализ данных в различных разрезах:
    - По направлениям подготовки
    - По учебным заведениям
    - По формам обучения
    - По курсам
    """
    
    def analyze_by_dimension(self, data, dimension, competency_field):
        """
        Анализирует компетенцию в разрезе указанного измерения.
        
        Args:
            data: DataFrame с данными
            dimension: Измерение для группировки (institution, spec, form, course)
            competency_field: Поле компетенции
        
        Returns:
            dict: Результаты анализа
        """
        results = []
        
        for group_value, group_df in data.groupby(dimension):
            scores = group_df[competency_field].dropna()
            
            if len(scores) < 5:
                continue
            
            results.append({
                'group': str(group_value),
                'n': len(scores),
                'mean': float(scores.mean()),
                'std': float(scores.std()),
                'median': float(scores.median()),
                'min': float(scores.min()),
                'max': float(scores.max()),
                'q25': float(scores.quantile(0.25)),
                'q75': float(scores.quantile(0.75))
            })
        
        # ANOVA для проверки различий между группами
        if len(results) >= 2:
            groups_data = [data[data[dimension] == r['group']][competency_field].dropna() for r in results]
            f_stat, p_value = stats.f_oneway(*groups_data)
            
            return {
                'status': 'success',
                'dimension': dimension,
                'competency': competency_field,
                'groups': results,
                'anova': {
                    'f_statistic': float(f_stat),
                    'p_value': float(p_value),
                    'significant_difference': p_value < 0.05
                }
            }
        
        return {
            'status': 'success',
            'dimension': dimension,
            'competency': competency_field,
            'groups': results
        }
    
    def compare_all_dimensions(self, data, competency_field):
        """Сравнивает все измерения для одной компетенции."""
        dimensions = ['institution', 'spec', 'form', 'course']
        
        results = {}
        for dim in dimensions:
            if dim in data.columns:
                results[dim] = self.analyze_by_dimension(data, dim, competency_field)
        
        return results