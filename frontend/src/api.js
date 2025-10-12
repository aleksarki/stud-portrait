import axios from "axios";

export async function portraitGetStudents() {
    return (await axios.get("http://localhost:8000/portrait/students/")).data;
}

export async function portraitGetResults(stud_id, dataSetter) {
    try {
        axios.get(`http://localhost:8000/portrait/results/?stud_id=${stud_id}`)
            .then(response => dataSetter?.(response.data));
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}
