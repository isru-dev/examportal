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
// --- NEW: View Details Function ---
function viewDetails(examId) {
    // Fetch specific exam details from the server
    fetch(`/api/exam-details/${examId}`)
        .then(res => res.json())
        .then(exam => {
            const modal = document.getElementById('examModal');
            const detailsContent = document.getElementById('modalBody');

            // Inject details into the modal
            detailsContent.innerHTML = `
                <p><strong>Title:</strong> ${exam.Title}</p>
                <p><strong>Course Code:</strong> ${exam.CourseCode}</p>
                <p><strong>Instructor:</strong> ${exam.TeacherName}</p>
                <p><strong>Duration:</strong> ${exam.TimeLimit} Minutes</p>
                <p><strong>Total Questions:</strong> ${exam.TotalQuestions}</p>
                <p style="margin-top:10px; color:#ffcc00;">
                    <i class="fa-solid fa-circle-info"></i> 
                    Make sure you have a stable internet connection before starting.
                </p>
            `;

            // Show the modal and overlay
            modal.style.display = 'block';
            document.getElementById('overlay').style.display = 'block';
        })
        .catch(err => alert("Error loading details."));
}

// Function to close modal
function closeModal() {
    document.getElementById('examModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

// Close modal if user clicks the overlay
document.getElementById('overlay').addEventListener('click', closeModal);