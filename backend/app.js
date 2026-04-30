const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

let app = express();
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

app.post('/register', async (req, res) => {
  console.log(req.body);
  const { first_name, last_name, username, password, role, year, section,department } = req.body;
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  let RoleID = (role.toLowerCase() === 'student') ? 1 : 2;
  let fullName = `${firstName} ${lastName}`;
  let userT = `INSERT INTO users (FullName,Username,password,RoleID,Year, Batch, Department)
    VALUES (?,?,?,?,?,?,?);
  `;

  connection.query(userT, [fullName, username, hashedPassword, RoleID,year, batch, department], (err, result) => {
    if (err) {
      console.log(err);
      return res.send("Error registering user");
    }

    let userId = result.insertId;
    req.session.userId = userId;    // Save the ID
    req.session.role = role;    // Save the Role (Teacher/Student)
    req.session.name = fullName;
    if (role.toLowerCase() === 'student') {
      let studentT = `INSERT INTO Students (UserID)
    VALUES (?);
  `;
      connection.query(studentT, [userId], (err) => {
        if (err) console.log(err);
        // res.send("Student Registered!");
        res.redirect('/studentdash');
      });
    }
    else {
      let teachersT = `INSERT INTO Teachers (UserID)
    VALUES (?);
  `;
      connection.query(teachersT, [userId], (err) => {
        if (err) console.log(err);
        // res.send("Teacher Registered!");
        res.redirect('/teachersdash');

      });
    }


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

app.listen(5000, (err) => {
  if (err)
    console.log(err);
});