const express=require('express');
const mysql=require('mysql2');

let app=express();
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
app.get('/register',()=>{
  
});
app.listen(5000,(err)=>{
  if(err)
     console.log(err);
  });