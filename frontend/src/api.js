import axios from "axios";

export async function portraitGetStudents() {
    return (await axios.get("http://localhost:8000/portrait/students/")).data;
}

export async function portraitGetResults(stud_id, dataSetter) {
    try {
        const response = await axios.get(`http://localhost:8000/portrait/results/?stud_id=${stud_id}`);
        // Преобразуем данные из новой структуры бэкенда в плоскую структуру
        const flattenedData = response.data.results.map(result => {
            const flatResult = {
                res_id: result.res_id,
                res_year: result.res_year
            };
            
            // Объединяем все категории в один объект
            Object.values(result).forEach(category => {
                if (typeof category === 'object' && category !== null) {
                    Object.assign(flatResult, category);
                }
            });
            
            return flatResult;
        });
        
        const transformedData = {
            student: response.data.student,
            results: flattenedData
        };
        
        dataSetter?.(transformedData);
        return transformedData;  // not needed prolly
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}
