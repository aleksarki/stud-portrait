import axios from "axios";

export async function portraitGetStudents() {
    return (await axios.get("http://localhost:8000/portrait/students/")).data;
}

export async function portraitGetResults(stud_id, dataSetter) {
    try {
        const response = await axios.get(`http://localhost:8000/portrait/student-results/?stud_id=${stud_id}`);
        
        const transformedData = {
            student: response.data.student,
            results: response.data.results
        };
        
        dataSetter?.(transformedData);
        return transformedData;
    }
    catch (error) {
        console.error('Error fetching results:', error);
        throw error;
    }
}
