
# 🎓 Exam Portal - Student & Teacher Dashboard

A full-stack, modern examination management system designed for university environments. This project provides a streamlined workflow for teachers to create exams and for students to take them in real-time with automated grading.

## 🚀 Features

### **Teacher Dashboard**
*   **Exam Management**: Create, view, and manage exam schedules.
*   **Real-time Gradebook**: Access student results dynamically via an EJS-rendered interface.
*   **Minimalist UI**: Designed with professional color palettes and high-contrast typography for ease of use.

### **Student Dashboard**
*   **Dynamic Exam Schedule**: Shows available exams based on the student's batch/department (e.g., Electrical Engineering).
*   **Automatic Filtering**: Exams disappear from the active list once completed to prevent duplicate attempts.
*   **Secure Authentication**: Role-based access control for students and staff.

## 🛠️ Tech Stack

*   **Frontend**: HTML5, CSS3 (Modern UI with soft shadows), JavaScript (Vanilla ES6).
*   **Backend**: Node.js, Express.js.
*   **Database**: MySQL (Relational schema for Users, Exams, and Results).
*   **Templating**: EJS (Embedded JavaScript) for dynamic data rendering.

## 📁 Project Structure

```text
examportal/
├── backend/
│   ├── app.js            # Main Express server logic
│   ├── .env              # Environment variables (DB credentials)
│   ├── js/               # Frontend logic (stud.js, menu.js)
│   ├── styles/           # Modular CSS (staff.css, student.css)
│   └── views/            # EJS templates (gradebook, dashboard)
└── sql/
    └── schema.sql        # Database tables and sample data
```

## ⚙️ Setup & Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/exam-portal.git
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment Variables**:
    Create a `.env` file in the `backend/` directory:
    ```env
    DB_HOST=127.0.0.1
    DB_USER=root
    DB_PASS=your_password
    DB_NAME=profile
    ```
4.  Database Setup:
    Import the provided SQL schema into your MySQL instance.
5.  **Run the application**:
    ```bash
    nodemon app.js
    ```




