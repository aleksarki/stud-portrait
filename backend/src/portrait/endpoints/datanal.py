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

    def __init__(self):
        self.global_expected_growth = None  # задаётся извне или вычисляется на когорте

    def compute_global_baseline(self, cohort_df):
        """
        Вычисляет глобальный ожидаемый рост на основе когорты.
        
        Args:
            cohort_df: DataFrame с колонками [student_id, year, course, competency_score]
        
        Returns:
            float: Ожидаемый рост
        """
        all_growths = []
        for _, sdf in cohort_df.groupby('student_id'):
            sdf = sdf.sort_values(['year', 'course'])
            growths = sdf['competency_score'].diff().dropna()
            all_growths.extend(growths.tolist())

        if not all_growths:
            self.global_expected_growth = 0.0
            return 0.0

        positive_growths = [g for g in all_growths if g > 0]

        if not positive_growths:
            # Все студенты деградируют — baseline = 0 (ожидаем хотя бы стабильность)
            self.global_expected_growth = 0.0
        else:
            # Медиана только по тем, кто реально вырос
            self.global_expected_growth = float(np.median(positive_growths))

        return self.global_expected_growth

    def fit_for_student(self, student_data, expected_growth=None):
        """
        Рассчитывает Value-Added для одного студента.
        
        Args:
            student_data: DataFrame с колонками [year, course, competency_score]
            expected_growth: Ожидаемый рост (если None - используется глобальный baseline)
        
        Returns:
            dict: Результаты анализа
        """
        if len(student_data) < 2:
            return {'status': 'insufficient_data',
                    'message': 'Недостаточно данных (нужно минимум 2 замера)'}

        student_data = student_data.sort_values(['year', 'course'])
        student_data = student_data.copy()
        student_data['prev_score'] = student_data['competency_score'].shift(1)
        student_data['actual_growth'] = student_data['competency_score'] - student_data['prev_score']

        growth_data = student_data[student_data['prev_score'].notna()].copy()
        if len(growth_data) == 0:
            return {'status': 'insufficient_data',
                    'message': 'Недостаточно данных для расчёта прироста'}

        # Определяем baseline: приоритет — аргумент → global → fallback
        if expected_growth is not None:
            baseline = expected_growth
        elif self.global_expected_growth is not None:
            baseline = self.global_expected_growth
        else:
            # fallback только для студента без когорты
            baseline = float(growth_data['prev_score'].iloc[0]) * 0.05

        growth_data['expected_growth'] = baseline
        growth_data['value_added'] = growth_data['actual_growth'] - baseline

        avg_va = growth_data['value_added'].mean()
        std_va = growth_data['value_added'].std() if len(growth_data) > 1 else 0.0

        if std_va and avg_va > 0.5 * std_va:
            performance, label = 'above_expected', 'Выше ожидаемого'
        elif std_va and avg_va < -0.5 * std_va:
            performance, label = 'below_expected', 'Ниже ожидаемого'
        else:
            performance, label = 'as_expected', 'Соответствует ожиданиям'

        return {
            'status': 'success',
            'measurements': len(growth_data),
            'average_value_added': float(avg_va),
            'total_growth': float(growth_data['actual_growth'].sum()),
            'expected_growth_per_period': float(baseline),
            'performance': performance,
            'performance_label': label,
            'growth_by_period': growth_data[
                ['year', 'course', 'actual_growth', 'expected_growth', 'value_added']
            ].to_dict('records')
        }

    def fit_cohort(self, cohort_data):
        """
        Сначала вычисляет глобальный baseline, потом считает VAM для каждого студента.
        
        Args:
            cohort_data: DataFrame с колонками [student_id, year, course, competency_score]
        
        Returns:
            dict: Результаты анализа когорты
        """
        cohort_df = cohort_data.rename(columns={'time_point': 'course'}) \
            if 'time_point' in cohort_data.columns else cohort_data.copy()
        
        # Вычисляем глобальный baseline по всей когорте
        self.compute_global_baseline(cohort_df)

        results = []
        for student_id, sdf in cohort_df.groupby('student_id'):
            sdf = sdf.rename(columns={'time_point': 'course'}) \
                if 'time_point' in sdf.columns else sdf
            r = self.fit_for_student(sdf)
            if r['status'] == 'success':
                r['student_id'] = student_id
                results.append(r)

        if not results:
            return {'status': 'error', 'message': 'Нет студентов с достаточными данными'}

        avg_values = [r['average_value_added'] for r in results]
        return {
            'status': 'success',
            'global_expected_growth': self.global_expected_growth,
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
    
    # Поддерживаемые форматы оценок
    GRADES_TEXT = ['отл.', 'хор.', 'удовл.', 'неудовл.', 'не явился']
    GRADES_NUM = [5, 4, 3, 2, 1]
    
    @staticmethod
    def convert_grade_to_text(grade):
        """Конвертирует числовую оценку в текстовый формат."""
        if grade is None:
            return None
        grade_map = {
            5: 'отл.',
            4: 'хор.',
            3: 'удовл.',
            2: 'неудовл.',
            1: 'не явился'
        }
        return grade_map.get(int(grade), str(grade))
    
    @staticmethod
    def convert_grade_to_num(grade_text):
        """Конвертирует текстовую оценку в числовой формат."""
        if grade_text is None:
            return None
        grade_text = str(grade_text).strip().lower()
        grade_map = {
            'отл.': 5,
            'отлично': 5,
            'хор.': 4,
            'хорошо': 4,
            'удовл.': 3,
            'удовлетворительно': 3,
            'неудовл.': 2,
            'неудовлетворительно': 2,
            'не явился': 1,
            'неявка': 1
        }
        return grade_map.get(grade_text, None)
    
    def analyze_discipline_impact(self, discipline_data, competency_field, grade_format='text'):
        """
        Анализирует влияние дисциплины на компетенцию.
        
        Args:
            discipline_data: DataFrame с колонками [student_id, discipline, grade, year, {competency}_before, {competency}_after]
            competency_field: Название поля компетенции
            grade_format: 'text' или 'num' - формат оценок в данных
        
        Returns:
            dict: Результаты анализа
        """
        # Определяем список оценок в зависимости от формата
        if grade_format == 'num':
            grades = self.GRADES_NUM
        else:
            grades = self.GRADES_TEXT
        
        results = []

        def _calc_grade_impact(group_df, grade, competency_field):
            """Считает статистику для одной оценки в одной группе."""
            grade_students = group_df[group_df['grade'] == grade]
            if len(grade_students) < 5:
                return None
            before_scores = grade_students[f'{competency_field}_before'].values
            after_scores  = grade_students[f'{competency_field}_after'].values
            t_stat, p_value = stats.ttest_rel(after_scores, before_scores)
            mean_diff  = after_scores.mean() - before_scores.mean()
            std_pooled = np.sqrt((before_scores.std()**2 + after_scores.std()**2) / 2)
            cohens_d   = mean_diff / std_pooled if std_pooled > 0 else 0
            return {
                'n_students':       len(grade_students),
                'mean_before':      float(before_scores.mean()),
                'mean_after':       float(after_scores.mean()),
                'mean_gain':        float(mean_diff),
                't_statistic':      float(t_stat),
                'p_value':          float(p_value),
                'cohens_d':         float(cohens_d),
                'significant':      bool(p_value < 0.05),
                'effect_size_label': self._interpret_effect_size(cohens_d)
            }

        # Группируем по дисциплинам
        for discipline, disc_df in discipline_data.groupby('discipline'):

            # --- Общая статистика по оценкам (агрегат по всем направлениям) ---
            grade_impacts = {}
            for grade in grades:
                impact = _calc_grade_impact(disc_df, grade, competency_field)
                if impact:
                    grade_impacts[grade] = impact

            # --- Разбивка по направлениям ---
            by_direction = {}
            if 'direction' in disc_df.columns:
                for direction, dir_df in disc_df.groupby('direction'):
                    dir_grades = {}
                    for grade in grades:
                        impact = _calc_grade_impact(dir_df, grade, competency_field)
                        if impact:
                            dir_grades[grade] = impact
                    if dir_grades:
                        by_direction[direction] = {
                            'grade_impacts': dir_grades,
                            'summary': self._summarize_discipline_impact(dir_grades)
                        }

            if grade_impacts:
                results.append({
                    'discipline': discipline,
                    'competency': competency_field,
                    'grade_impacts': grade_impacts,
                    'by_direction': by_direction,
                    'summary': self._summarize_discipline_impact(grade_impacts)
                })
        
        return {
            'status': 'success',
            'results': results
        }
    
    def analyze_all_disciplines(self, full_data, grade_format='text'):
        """
        Анализирует влияние всех дисциплин на все компетенции.
        
        Args:
            full_data: DataFrame с полными данными
            grade_format: 'text' или 'num' - формат оценок
        
        Returns:
            dict: Комплексные результаты
        """
        competencies = [
            COMP.LEADERSHIP,
            COMP.PLANNING,
            COMP.RESULT_ORIENT,
            COMP.INFO_ANALYSIS,
            COMP.COMMUNICATION
        ]
        
        all_results = {}
        
        for comp in competencies:
            comp_results = self.analyze_discipline_impact(full_data, comp, grade_format)
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
        
        avg_gain = np.mean(all_gains) if all_gains else 0
        avg_effect = np.mean(all_cohens_d) if all_cohens_d else 0
        
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
            groups_data = [g for g in groups_data if len(g) > 1]  # Убираем группы с 1 элементом
            
            if len(groups_data) >= 2:
                try:
                    f_stat, p_value = stats.f_oneway(*groups_data)
                    anova_result = {
                        'f_statistic': float(f_stat),
                        'p_value': float(p_value),
                        'significant_difference': p_value < 0.05
                    }
                except:
                    anova_result = None
            else:
                anova_result = None
        else:
            anova_result = None
        
        return {
            'status': 'success',
            'dimension': dimension,
            'competency': competency_field,
            'groups': results,
            'anova': anova_result
        }
    
    def compare_all_dimensions(self, data, competency_field):
        """Сравнивает все измерения для одной компетенции."""
        dimensions = ['institution', 'spec', 'form', 'course']
        
        results = {}
        for dim in dimensions:
            if dim in data.columns:
                results[dim] = self.analyze_by_dimension(data, dim, competency_field)
        
        return results
