 let menu=document.querySelector('.fa-bars');
let sidepro=document.querySelector('.side-prof');
let hero=document.querySelector('.hero-section');
let close=document.querySelector('.fa-xmark');
let n=document.getElementById('name');
let user=document.getElementById('user');
console.log(n);


 async function userinfo(){
  try{
  const response=await fetch('/userinfo');
  const data = await response.json();
  console.log(data);

   if(data.loggedIn){
     n.innerText=data.name;
     user.innerText=data.name;
   }else{
    window.location.href = '/login.html';
   }
  }
  catch(err){
    console.error("Error fetching user info:", err);
  }
 }
  userinfo();

console.log(n);

close.addEventListener('click',()=>{
  sidepro.style.display='none';
  document.getElementById('overlay').classList.remove("active");
});
menu.addEventListener('click',()=>{
 sidepro.classList.toggle("visible");
   console.log();
 document.getElementById('overlay').classList.toggle("active");
});
// 1. Find your logout button (add id="logout" to your HTML)
let logoutBtn = document.getElementById('logout');

// 2. Add the click event
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Stop the page from jumping
    
    if(confirm("Are you sure you want to logout?")) {
        window.location.href = '/logout';
    }
});