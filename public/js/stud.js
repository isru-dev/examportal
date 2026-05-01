document.addEventListener('DOMContentLoaded', () => {
    const examContainer = document.getElementById('dynamic-exam-list');
    const studentNameSpan = document.getElementById('name');
    const userSpan = document.getElementById('user');

    // 1. Fetch Student Profile for the Hero Section
    fetch('/api/user-profile') // You'll need this simple route to get session info
        .then(res => res.json())
        .then(user => {
            studentNameSpan.innerText = user.fullName;
            userSpan.innerText = user.fullName;
        });

    // 2. Fetch Available Exams
    fetch('/available-exams')
        .then(res => res.json())
        .then(exams => {
            if (exams.length === 0) {
                examContainer.innerHTML = '<p style="text-align: center; color: white; padding: 20px;">No exams scheduled for your batch.</p>';
                return;
            }

            // Map the exams into your existing CSS structure
            examContainer.innerHTML = exams.map(exam => `
                <div class="course1">
                    <div class="coursename">
                        <h3>${exam.Title} (${exam.CourseCode})</h3>
                    </div>
                    <div class="btn">
                        <div class="details">
                            <button onclick="viewDetails('${exam.ExamID}')">View Details</button>
                        </div>
                        <div class="start">
                            <button onclick="startExam('${exam.ExamID}', '${exam.Title}')">Start Exam</button>
                        </div>
                    </div>
                </div>
            `).join('');
        })
        .catch(err => {
            console.error("Error fetching exams:", err);
            examContainer.innerHTML = '<p style="color: red;">Failed to load exams.</p>';
        });
});

// Start Exam Function
function startExam(id, title) {
    if (confirm(`Do you want to start the ${title} exam? The timer begins now.`)) {
        window.location.href = `/take-exam/${id}`;
    }
}