const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');

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
  const roleTable = `
    CREATE TABLE IF NOT EXISTS Roles (
      RoleID INT PRIMARY KEY AUTO_INCREMENT,
      RoleName VARCHAR(50) NOT NULL UNIQUE
    );`;

  const usersTable = `
    CREATE TABLE IF NOT EXISTS Users (
      UserID INT PRIMARY KEY AUTO_INCREMENT,
      FullName VARCHAR(255) NOT NULL,
      Username VARCHAR(100) NOT NULL UNIQUE,
      Password VARCHAR(255) NOT NULL,
      RoleID INT,
      FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
    );`;

  const studentsTable = `
    CREATE TABLE IF NOT EXISTS Students (
      StudentID INT PRIMARY KEY AUTO_INCREMENT,
      UserID INT,
      FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
    );`;

  const teachersTable = `
    CREATE TABLE IF NOT EXISTS Teachers (
      TeacherID INT PRIMARY KEY AUTO_INCREMENT,
      UserID INT,
      FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
    );`;

  // Execute queries in order (Roles must exist before Users)
  connection.query(roleTable, (err) => {
    if (err) console.error("Role Table Error:", err);

    connection.query(usersTable, (err) => {
      if (err) console.error("Users Table Error:", err);

      connection.query(studentsTable, (err) => {
        if (err) console.error("Students Table Error:", err);

        connection.query(teachersTable, (err) => {
          if (err) console.error("Teachers Table Error:", err);

          // Seed initial roles if they don't exist
          const seedRoles = "INSERT IGNORE INTO Roles (RoleName) VALUES ('Student'), ('Teacher')";
          connection.query(seedRoles);

          res.send("<h1>Database Schema Created Successfully!</h1>");
        });
      });
    });
  });
});

app.post('/register', (req, res) => {
  console.log(req.body);
  let firstName = req.body.first_name;
  let lastName = req.body.last_name;
  let username = req.body.username;
  let role = req.body.role;
  let password = req.body.password;

  let RoleID = (role.toLowerCase() === 'student') ? 1 : 2;
  let fullName = `${firstName} ${lastName}`;
  let userT = `INSERT INTO users (FullName,Username,password,RoleID)
    VALUES ('${fullName}','${username}','${password}',${RoleID});
  `;

  connection.query(userT, (err, result) => {
    if (err) console.log(err);
    let userId = result.insertId;
    req.session.userId = userId;    // Save the ID
    req.session.role = role;    // Save the Role (Teacher/Student)
    req.session.name = fullName;
    if (role === 'Student') {
      let studentT = `INSERT INTO Students (UserID)
    VALUES (${userId});
  `;
      connection.query(studentT, () => {
        if (err) console.log(err);
        // res.send("Student Registered!");
        res.redirect('/studentdash');
      });
    }
    else {
      let teachersT = `INSERT INTO Teachers (UserID)
    VALUES (${userId});-
  `;
      connection.query(teachersT, () => {
        if (err) console.log(err);
        // res.send("Teacher Registered!");
        res.redirect('/teachersdash');

      });
    }


  });

});
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

app.post('/login', (req, res) => {

  const { username, password } = req.body;

  const query = `
        SELECT  u.*, r.RoleName 
        FROM users u 
        JOIN roles r ON u.RoleID = r.RoleID
        WHERE u.Username = ? AND u.Password = ?`;

  connection.query(query, [username, password], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      const user = results[0];

      req.session.userId = user.UserID;    // Save the ID
      req.session.role = user.RoleName;    // Save the Role (Teacher/Student)
      req.session.name = user.FullName;
      console.log(req.session);


      // 2. Redirect based on the RoleName we got from the JOIN
      if (user.RoleName === 'Teacher') {
        res.redirect('/teachersdash');
      } else if (user.RoleName === 'Student') {
        res.redirect('/studentdash');
      }
    } else {
      res.send('Invalid username or password');
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