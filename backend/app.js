const express=require('express');
const mysql=require('mysql2');
const path=require('path');
const bodyParser=require('body-parser');


let app=express();
 app.use(bodyParser.urlencoded({extended:true}));//to change it to js object 

let connection=mysql.createConnection({
  host:"127.0.0.1",
  user:"root",
  password:"isru",
  database:"profile"
});
connection.connect((err)=>{
  if (err) {
    console.error('❌ Connection failed: ' + err.message);
    return;
  }
  console.log('✅ Connected to MySQL!');
});
//console.log(__filename);
  app.use(express.static(path.join(__dirname,'..','public')));

app.get('/register',(req,res)=>{
 // res.sendFile( path.join(__dirname, "../register.html"))
  //app.use(express.static(path.join(__dirname,"../public")));
  res.sendFile(path.join(__dirname,'..','public','register.html'));
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

app.post('/register',(req,res)=>{
  console.log(req.body);
  let firstName=req.body.first_name;
  let lastName=req.body.last_name;
  let username=req.body.username;
  let role=req.body.role;
  let Password=req.body.Password;
  let RoleID=1;
if(role==='Teacher'){
   RoleID=2;
}
let fullName = `${firstName} ${lastName}`;
 let userT=`INSERT INTO users (FullName,Username,Password,RoleID)
    VALUES ('${fullName}','${username}','${Password}',${RoleID});
  `;
 
connection.query(userT,(err,result)=>{
  if(err) console.log(err);
   let userId=result.insertId;

   if(role==='student'){
       let studentT=`INSERT INTO Students (UserID)
    VALUES (${userId});
  `;
     connection.query(studentT,()=>{
    if(err)  console.log(err); 
   // res.send("Student Registered!");
    res.redirect('/studentdash');
  });
   }
   else{
     let teachersT=`INSERT INTO Teachers (UserID)
    VALUES (${userId});
  `;
   connection.query(teachersT,()=>{
    if(err) console.log(err);
     // res.send("Teacher Registered!");
       res.redirect('/teachersdash');

  });
   }
    
   
});

});
app.get('/studentdash',(req,res)=>{
   res.sendFile(path.join(__dirname,'..','public','studentdash.html'))
});
app.get('/teachersdash',(req,res)=>{
   res.sendFile(path.join(__dirname,'..','public','teacherdashboard.html'))
});
app.post('/login',(req,res)=>{

})
app.listen(5000,(err)=>{
  if(err)
     console.log(err);
  });