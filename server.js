const http = require('http');
const PORT = 8000;
const WebApp = require('./webapp');
const timeStamp = require('./time.js').timeStamp;
const fs = require('fs');

let comments =fs.readFileSync('./data/feedback.json','utf8');
comments = JSON.parse(comments);
let registered_users =[{userName:'rahul', name:'Rahul'},
                       {userName:'vish', name:'Vishal'}];
let currentUser=undefined;

let toS = o=>JSON.stringify(o,null,2);

let logRequest = (req,res)=>{
  let text = ['------------------------------',
    `${timeStamp()}`,
    `${req.method} ${req.url}`,
    `HEADERS=> ${toS(req.headers)}`,
    `COOKIES=> ${toS(req.cookies)}`,
    `BODY=> ${toS(req.body)}`,''].join('\n');
  fs.appendFile('request.log',text,()=>{});
}
let loadUser = (req,res)=>{
  let sessionid = req.cookies.sessionid;
  let user = registered_users.find(u=>u.sessionid==sessionid);
  if(sessionid && user){
    req.user = user;
  }
};
let getContentType=function(file){
  let fileDetails = file.split('.');
  let extension = fileDetails[1];
  let mimeType={
    "html" : "text/html",
    "css" : "text/css",
    "jpg" : "img/jpg",
    "gif" : "img/gif",
    "js" : "text/javascript",
    "pdf" : "application/pdf"
  }
  return mimeType[extension];
}

let displayPage = function(req,res){
  let url= req.url=='/' ? '/index.html' : req.url;
  let file='./public'+url;
  fs.readFile(file,(err,data)=>{
    if(err){
      handleError(res);
      return;
    }
    res.setHeader('Content-Type',getContentType(url));
    res.write(data);
    if(url=='/guestBook.html') {
      res.write(`<h2>logged in user is:${currentUser}</h2>`);
      displayComments(res);
    }
    res.end();
  });
};

let displayComments=function(res){
  comments.forEach(function(feedback){
    res.write(`<p><b>Name:</b>   ${feedback.name}
              <br><b>comment:</b> ${feedback.comment}
              <br><b>Date:</b>  ${feedback.date}</p>`);
  });
  res.write(`<h1><a href="index.html">Home</a></h1>`);
  res.end();
};

let displayUserName=function(res){
  res.write(currentUser);
}

let app = WebApp.create();
app.use(logRequest);
app.use(loadUser);

let handleError = function(res) {
  res.write("NOT FOUND");
  res.statusCode = 404;
  res.end();
}

const removeEncoding=function(body){
  body.name=body.name.replace(/\+/g," ");
  body.comment=body.comment.replace(/\+/g," ");
  return body;
}

let servePage=function(req,res){
  app(req,res);
  app.get(req.url,(req,res)=>{
    if(!req.cookies.sessionid && req.url=='/guestBook.html'){
      displayComments(res);
      return;
    } else if(req.cookies.sessionid && req.url=='/login.html'){
      res.redirect('/index.html');
      return;
    }
    displayPage(req,res);
  });

  app.post("/index.html",(req,res)=>{
    let user = registered_users.find(u=>u.userName==req.body.userName);
    if(!user) {
      res.setHeader('Set-Cookie',`logInFailed=true`);
      res.redirect('/login.html');
      return;
    }
    let sessionid = new Date().getTime();
    res.setHeader('Set-Cookie',`sessionid=${sessionid}`);
    user.sessionid = sessionid;
    currentUser=req.body.userName;
    displayPage(req,res);
  });

  app.post("/guestBook.html",(req,res)=>{
    if(Object.keys(req.body).length!=0){
      let feedback = removeEncoding(req.body);
      feedback.date=new Date().toLocaleString();
      comments.push(feedback);
      fs.writeFileSync('./data/feedback.json',JSON.stringify(comments));
    }
    displayPage(req,res);
  });

  app.get('/logout.html',(req,res)=>{
    if(!req.cookies.sessionid){
      res.redirect('/login.html');
      return;
    }
    res.setHeader('Set-Cookie',[`logInFailed=false; Expires=${new Date(1).toUTCString()}`,`sessionid=0; Expires=${new Date(1).toUTCString()}`]);
    displayPage(req,res);
  });
}

let server=http.createServer(servePage);
server.listen(PORT);
console.log(`listening on ${PORT}`);
