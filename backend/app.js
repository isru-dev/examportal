const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const fileUpload = require('express-fileupload');
const streamifier = require('streamifier');
const csv = require('csv-parser');


let app = express();
app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: true }));//to change it to js object 
const session = require('express-session');
const { log } = require('console');

// This tells Express to handle the "VIP Wristbands" (Sessions)
app.use(session({
  secret: 'isru_secret_key', // A random string used to sign the session cookie
  resave: false,             // Don't resave the session if nothing changed
  saveUninitialized: false,  // Don't create a session until a user logs in
  cookie: { maxAge: 3600000 } // The cookie expires in 1 hour (3,600,000 ms)
}));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
let connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "isru",
  database: "profile"
});
connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed: ' + err.message);
    return;
  }
  console.log('✅ Connected to MySQL!');
});
//console.log(__filename);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/register', (req, res) => {
  // res.sendFile( path.join(__dirname, "../register.html"))
  //app.use(express.static(path.join(__dirname,"../public")));
  res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});


app.get('/install', (req, res) => {
  // 1. Roles (Parent of Users)
  const roleTable = `CREATE TABLE IF NOT EXISTS Roles (
        RoleID INT PRIMARY KEY AUTO_INCREMENT,
        RoleName VARCHAR(50) NOT NULL UNIQUE
    );`;

  // 2. Users (Added Batch/Year for filtering)
  const usersTable = `CREATE TABLE IF NOT EXISTS Users (
        UserID INT PRIMARY KEY AUTO_INCREMENT,
        FullName VARCHAR(255) NOT NULL,
        University_ID VARCHAR(20) NOT NULL UNIQUE,
        Password VARCHAR(255) NOT NULL,
        RoleID INT,
        Department VARCHAR(100), -- e.g., 'Computer Science'
        section VARCHAR(50), 
        Year INT,
        FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
    );`;
  // Add these to your /install route
  const studentMasterTable = `CREATE TABLE IF NOT EXISTS Student_Master (
    ID_Number VARCHAR(20) PRIMARY KEY, -- e.g., 'UGR/1234/18'
    FullName VARCHAR(255),
    Department VARCHAR(100),
    Batch VARCHAR(50),
    Year INT
);`;

  const teacherMasterTable = `CREATE TABLE IF NOT EXISTS Teacher_Master (
    Employee_ID VARCHAR(20) PRIMARY KEY, -- e.g., 'EMP/5566'
    FullName VARCHAR(255),
    Department VARCHAR(100)
);`;
  // 3. Exams (Parent of Questions and Results)
  const examsTable = `CREATE TABLE IF NOT EXISTS Exams (
        ExamID INT PRIMARY KEY AUTO_INCREMENT,
        TeacherID INT,
        Title VARCHAR(255) NOT NULL,
        CourseCode VARCHAR(50),
        Department VARCHAR(100), -- e.g., 'Computer Science'
        TimeLimit INT, -- minutes
        TargetYear INT,
        TargetBatch VARCHAR(50),
        FOREIGN KEY (TeacherID) REFERENCES Users(UserID)
    );`;

  // 4. Questions (Child of Exams)
  const questionsTable = `CREATE TABLE IF NOT EXISTS Questions (
        QuestionID INT PRIMARY KEY AUTO_INCREMENT,
        ExamID INT,
        QuestionText TEXT NOT NULL,
        OptA VARCHAR(255), OptB VARCHAR(255), OptC VARCHAR(255), OptD VARCHAR(255),
        CorrectOption CHAR(1),
        FOREIGN KEY (ExamID) REFERENCES Exams(ExamID) ON DELETE CASCADE
    );`;

  // 5. Results (Child of Users and Exams)
  const resultsTable = `CREATE TABLE IF NOT EXISTS Results (
        ResultID INT PRIMARY KEY AUTO_INCREMENT,
        UserID INT,
        ExamID INT,
        Score INT,
        TotalQuestions INT,
        DateTaken TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (UserID) REFERENCES Users(UserID),
        FOREIGN KEY (ExamID) REFERENCES Exams(ExamID)
    );`;

  connection.query(roleTable, () => {
    connection.query(usersTable, () => {
      connection.query(studentMasterTable, () => {
        connection.query(teacherMasterTable, () => {
          connection.query(examsTable, () => {
            connection.query(questionsTable, () => {
              connection.query(resultsTable, () => {
                // Seed initial roles
                const seedRoles = "INSERT IGNORE INTO Roles (RoleName) VALUES ('Student'), ('Teacher')";
                connection.query(seedRoles, () => {
                  res.send("<h1>Full Exam Portal Schema Installed Successfully!</h1>");
                });
              });
            });
          });
        });
      });
    });
  });
});

app.post('/register', async (req, res) => {
  const { university_id, password, confirm_password, role } = req.body;

  // 1. Basic Validation
  if (password !== confirm_password) {
    return res.send("Passwords do not match.");
  }

  // 2. Check if user already exists in our app
  const checkUser = "SELECT * FROM Users WHERE University_ID = ?";
  connection.query(checkUser, [university_id], async (err, existingUsers) => {
    if (existingUsers.length > 0) {
      return res.send("This University ID is already registered. Please login.");
    }

    // 3. Verify against the Master List (The Gatekeeper)
    const masterTable = (role === 'Student') ? 'Student_Master' : 'Teacher_Master';
    const idCol = (role === 'Student') ? 'ID_Number' : 'Employee_ID';

    connection.query(`SELECT * FROM ${masterTable} WHERE ${idCol} = ?`, [university_id], async (err, masterData) => {
      if (err || masterData.length === 0) {
        return res.send("Invalid University ID. Not found in official records.");
      }

      const officialInfo = masterData[0]; // Official name, dept, year, etc.

      try {
        // 4. Secure the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const roleID = (role === 'Student') ? 1 : 2;

        // 5. Save using official data from Master List
        const insertQuery = `
                    INSERT INTO Users (University_ID, FullName, Password, RoleID, Department, Batch, Year) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const values = [
          university_id,
          officialInfo.FullName,
          hashedPassword,
          roleID,
          officialInfo.Department,
          officialInfo.Batch || null, // Teachers won't have a batch
          officialInfo.Year || null // Teachers won't have a year
        ];

        connection.query(insertQuery, values, (err, result) => {
          if (err) return res.send("Error during registration: " + err.message);

          // Set Session
          req.session.userId = result.insertId;
          req.session.role = role;
          req.session.name = officialInfo.FullName;

          res.redirect(role === 'Student' ? '/studentdash' : '/teachersdash');
        });
      } catch (error) {
        res.status(500).send("Server error during hashing.");
      }
    });
  });
});
function isLoggedIn(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.send("Please login first.");
  }
}
function isStudent(req, res, next) {
  if (req.session.role === 'Student') {
    next();
  } else {
    res.redirect('/login.html');
  }
}
function isTeacher(req, res, next) {
  if (req.session.role === 'Teacher') {
    next();
  } else {
    res.redirect('/login.html');
  }
}
app.get('/studentdash', isLoggedIn, isStudent, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'studentdash.html'));
});

app.get('/teachersdash', isLoggedIn, isTeacher, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'teacherdashboard.html'));
});
/*
app.get('/studentdash', (req, res) => {
  // Check if the user is logged in AND is a Teacher
  if (req.session.userId && req.session.role === 'Student') {
    res.sendFile(path.join(__dirname, '..', 'public', 'studentdash.html'));
  } else {
    res.send("Please login as a Student to view this page.");
  }
});
app.get('/teachersdash', (req, res) => {
  // Check if the user is logged in AND is a Teacher
  if (req.session.userId && req.session.role === 'Teacher') {
    res.sendFile(path.join(__dirname, '..', 'public', 'teacherdashboard.html'));
  } else {
    res.send("Please login as a Teacher to view this page.");
  }
});
*/
app.post('/login', (req, res) => {
  const { university_id, password } = req.body;

  // Join with Roles to get 'Student' or 'Teacher' string for redirection
  const query = `
        SELECT u.*, r.RoleName 
        FROM Users u 
        JOIN Roles r ON u.RoleID = r.RoleID
        WHERE u.University_ID = ?`;

  connection.query(query, [university_id], async (err, results) => {
    if (err) return res.status(500).send("Database error");

    if (results.length > 0) {
      const user = results[0];

      // Compare the plain text password with the hashed password in DB
      const isMatch = await bcrypt.compare(password, user.Password);

      if (isMatch) {
        // Set Session data
        req.session.userId = user.UserID;
        req.session.role = user.RoleName;
        req.session.name = user.FullName;
        req.session.dept = user.Department; // Useful for filtering exams later
        req.session.year = user.Year;       // Save Year
        req.session.batch = user.Batch;
        // Redirect based on the pre-assigned role
        if (user.RoleName === 'Teacher') {
          res.redirect('/teachersdash');
        } else {
          res.redirect('/studentdash');
        }
      } else {
        res.send("Invalid ID or Password.");
      }
    } else {
      res.send("User not found. Please register first.");
    }
  });
});


app.get('/logout', (req, res) => {
  // 1. Destroy the session in the server's memory
  req.session.destroy((err) => {
    if (err) {
      console.log("Logout Error:", err);
      return res.send("Error logging out.");
    }

    // 2. Clear the cookie in the user's browser and if the user wants to comeback by press back it reject it
    res.clearCookie('connect.sid');

    // 3. Send them back to the login page
    res.redirect('/login.html');
  });
});
app.get('/userinfo', (req, res) => {
  if (req.session.userId) {
    console.log(req.session.userId);

    res.json({
      loggedIn: true,
      name: req.session.name
    });
  } else {
    console.log("No session found!");
    res.json({ loggedIn: false });
  }
});


app.get('/download-template', isLoggedIn, isTeacher, (req, res) => {
  // The header row of the CSV file
  const csvContent = "QuestionText,OptA,OptB,OptC,OptD,CorrectOption\n";

  // Set the headers so the browser knows it's a file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=exam_template.csv');

  res.status(200).send(csvContent);
});

app.post('/create-exam-bulk', isLoggedIn, isTeacher, (req, res) => {
  console.log(req.body);
  console.log(req.files);
  const { title, course_code, time_limit, target_year, target_batch } = req.body;
  const teacherId = req.session.userId;
  const dept = req.session.dept;

  if (!req.files || !req.files.questionFile) {
    return res.status(400).send("No CSV file provided.");
  }

  // 🔁 START TRANSACTION
  connection.beginTransaction((err) => {
    if (err) return res.status(500).send("Transaction error");

    const examSql = `
        INSERT INTO Exams (TeacherID, Title, CourseCode, TimeLimit, TargetYear, TargetBatch, Department)
        VALUES (?, ?, ?, ?, ?, ?, ?)`;

    connection.query(examSql, [teacherId, title, course_code, time_limit, target_year, target_batch, dept], (err, result) => {
      if (err) {
        return connection.rollback(() => {
          res.status(500).send("Error creating exam");
        });
      }

      const examId = result.insertId;
      const questions = [];

      streamifier.createReadStream(req.files.questionFile.data)
        .pipe(csv())
        .on('data', (row) => {

          // 🧠 VALIDATION SECTION

          // 1. Empty row check
          if (!row.QuestionText && !row.OptA && !row.OptB && !row.OptC && !row.OptD) {
            return; // skip empty row
          }

          // 2. Missing fields
          if (!row.QuestionText || !row.OptA || !row.OptB || !row.OptC || !row.OptD || !row.CorrectOption) {
            return connection.rollback(() => {
              res.status(400).send("Missing fields in CSV");
            });
          }

          // 3. Validate CorrectOption
          const validOptions = ['A', 'B', 'C', 'D'];
          if (!validOptions.includes(row.CorrectOption.trim().toUpperCase())) {
            return connection.rollback(() => {
              res.status(400).send(`Invalid CorrectOption: ${row.CorrectOption}`);
            });
          }

          // ✔ If valid → push
          questions.push([
            examId,
            row.QuestionText,
            row.OptA,
            row.OptB,
            row.OptC,
            row.OptD,
            row.CorrectOption.toUpperCase()
          ]);
        })
        .on('end', () => {

          // ❌ No valid questions
          if (questions.length === 0) {
            return connection.rollback(() => {
              res.status(400).send("No valid questions found in CSV");
            });
          }

          const questionSql = `
                    INSERT INTO Questions 
                    (ExamID, QuestionText, OptA, OptB, OptC, OptD, CorrectOption) 
                    VALUES ?`;

          connection.query(questionSql, [questions], (err) => {
            if (err) {
              return connection.rollback(() => {
                res.status(500).send("Error inserting questions");
              });
            }

            // ✅ COMMIT (everything successful)
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  res.status(500).send("Commit failed");
                });
              }

              res.send(`
                                <script>
                                    alert("Exam and ${questions.length} questions uploaded successfully!");
                                    window.location.href = "/teachersdash";
                                </script>
                            `);
            });
          });
        });
    });
  });
});
app.get('/teacher-exams', isLoggedIn, isTeacher, (req, res) => {
  const teacherId = req.session.userId;

  const sql = `
        SELECT e.*, 
        COUNT(q.QuestionID) as TotalQuestions,
        CASE 
            WHEN COUNT(q.QuestionID) = 0 THEN 'Draft'
            WHEN e.CreatedAt > NOW() - INTERVAL 1 MINUTE THEN 'Just Published'
            ELSE 'Active'
        END AS Status
        FROM Exams e 
        LEFT JOIN Questions q ON e.ExamID = q.ExamID 
        WHERE e.TeacherID = ? 
        GROUP BY e.ExamID 
        ORDER BY e.CreatedAt DESC`;

  connection.query(sql, [teacherId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});


app.get('/api/exam-details/:id', isLoggedIn, (req, res) => {
  const examId = req.params.id;
  const sql = `
        SELECT e.*, u.FullName as TeacherName, 
        (SELECT COUNT(*) FROM Questions WHERE ExamID = e.ExamID) as TotalQuestions
        FROM Exams e
        JOIN Users u ON e.TeacherID = u.UserID
        WHERE e.ExamID = ?`;

  connection.query(sql, [examId], (err, result) => {
    if (err || result.length === 0) return res.status(404).send("Exam not found");
    res.json(result[0]);
  });
});

app.get('/available-exams', isLoggedIn, isStudent, (req, res) => {
  // These values were stored in the session during login from the Master List
  const { dept, year, batch } = req.session;
  console.log("Session Data:", req.session.dept, req.session.year, req.session.batch);
  const sql = `
        SELECT e.ExamID, e.Title, e.CourseCode, e.TimeLimit, t.FullName as TeacherName
        FROM Exams e
        JOIN Users t ON e.TeacherID = t.UserID
        WHERE e.Department = ? 
          AND e.TargetYear = ? 
          AND e.TargetBatch = ?
          AND (SELECT COUNT(*) FROM Questions q WHERE q.ExamID = e.ExamID) > 0`;

  connection.query(sql, [dept, year, batch], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

app.get('/take-exam/:id', isLoggedIn, isStudent, (req, res) => {
    const examId = req.params.id;
    const userId = req.session.userId;

    // 1. Get exam + validate access
    const examSql = `
        SELECT * FROM Exams 
        WHERE ExamID = ?
        AND Department = ?
        AND TargetYear = ?
        AND TargetBatch = ?
    `;

    connection.query(
        examSql,
        [examId, req.session.dept, req.session.year, req.session.batch],
        (err, examResult) => {

            if (err) return res.status(500).send("Database error");
            if (examResult.length === 0) {
                return res.send("Unauthorized access");
            }

            const exam = examResult[0];

            // 2. Check attempt
            const attemptSql = `
                SELECT StartTime FROM ExamAttempts 
                WHERE UserID = ? AND ExamID = ?
            `;

            connection.query(attemptSql, [userId, examId], (err, attempts) => {

                if (err) return res.status(500).send("Database error");

                let startTime;

                if (attempts.length === 0) {
                    startTime = new Date();

                    connection.query(
                        "INSERT INTO ExamAttempts (UserID, ExamID, StartTime) VALUES (?, ?, ?)",
                        [userId, examId, startTime],
                        (err) => {
                            if (err) console.log("Insert attempt error:", err);
                        }
                    );
                } else {
                    startTime = new Date(attempts[0].StartTime);
                }

                // 3. Calculate time
                const currentTime = new Date();
                const secondsElapsed = Math.floor((currentTime - startTime) / 1000);
                const totalSecondsAllowed = exam.TimeLimit * 60;
                const remainingSeconds = totalSecondsAllowed - secondsElapsed;

                if (remainingSeconds <= 0) {
                    return res.send("<h1>Time Expired</h1>");
                }

                // 4. Load questions
                const qSql = `
                    SELECT QuestionID, QuestionText, OptA, OptB, OptC, OptD
                    FROM Questions WHERE ExamID = ?
                `;

                connection.query(qSql, [examId], (err, questions) => {

                    if (err) return res.status(500).send("Error loading questions");

                    res.render('exam-room', {
                        questions,
                        examId,
                        timerSeconds: remainingSeconds
                    });

                });
            });
        }
    );
});


app.listen(5000, (err) => {
  if (err)
    console.log(err);
});