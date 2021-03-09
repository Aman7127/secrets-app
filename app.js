//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { use, authenticate } = require('passport');
const GoogleStrategy = require( "passport-google-oauth2" ).Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook").Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const InstagramStrategy = require('passport-instagram').Strategy;

const app = express();
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret : " thisisnotoursecret. ",
    resave : false,
    saveUninitialized : false ,


} ));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    email : String,
    password : String , 
    googleId : String ,
    githubId : String,
    facebookId : String,
    Secret : String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User" , userSchema);

passport.use(User.createStrategy());
 
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback   : true,
  },

  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/secrets",
    
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ githubId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, done) {
  User.findOrCreate( { facebookId: profile.id },function(err, user) {
    return done(err, user);
  });
}
));




app.get("/" , function(req,res){
res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope:   [ "email", "profile" ] }));

app.get("/auth/github",
  passport.authenticate("github", { scope: [ "user:email" ] }));

app.get("/auth/facebook", passport.authenticate("facebook"));


app.get("/auth/google/secrets",
    passport.authenticate( "google", {
        failureRedirect: "/login"
}) , 
function(req,res) {
    res.redirect("/secrets");
}
);

app.get("/submit" , function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
    } else {
    res.redirect("/login");
}
});

app.get("/auth/github/secrets", 
  passport.authenticate("github", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

  app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });




app.get("/login" , function(req,res){
    res.render("login");
});

app.get("/register" , function(req,res){
    res.render("register");
});

app.get("/secrets" , function(req,res){
     User.find({"Secret" :{$ne:null}} , function(err , foundSecretsuser){
       if(err){
         console.log(err);
       }else {if(foundSecretsuser){
         res.render("secrets" , {userwithsecrets : foundSecretsuser});
       }}

     })  
});

app.get("/logout" , function(req,res) {
    req.logout() ; 
    res.redirect("/") ; 
});


app.post("/register" , function(req,res){
/*---  ONLY FOR INFO ----*/
   // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //    const newUser = new User({
      //      email : req.body.username, 
       //     password : hash
       // });
    
   //     newUser.save(function(err){
     //       if(err){
       //         console.log(err);
         //   }else{
          //      res.render("secrets")
          //  }
       // });
    
   // });
   User.register({username : req.body.username } , req.body.password, function(err ,user){
    if(err){
        console.log(err) ;
        res.redirect("/register");
    }else {
        passport.authenticate("local")(req,res, function(){
            res.redirect("/secrets");
        });
    }
});
});  

app.post("/login" , function(req,res){
 
 /* ---- ONLY for info -----*/
 
    //   const username = req.body.username ;
 //   const password = req.body.password ; 

  //  User.findOne({email : username} , function(err , founduser){
   //     if(err){
    //        console.log(err);
     //   }else if (founduser)
      //  {
       //     bcrypt.compare(password, founduser.password, function(err, result) {
      //        if(result == true){
       //         res.render("secrets");
        //      }else if(result == false){
         //         console.log("Incorrect password ");
          //    }      
         //   });
            
      //  }
   // });
const user1 = new User({
    username  : req.body.username ,
    password : req.body.password
}); 

req.login(user1 , function(err){
    if(err){
        console.log(err);
    }else {
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        })
    }
})
});

app.post("/submit" , function(req,res){

  const submittedsecret = req.body.secret ; 

  User.findById(req.user._id , function(err ,foundID){
    if(err){
      console.log(err);
    }else{
      foundID.Secret = submittedsecret;
      foundID.save(function(err){
        res.redirect("/secrets");
      });
      
    }
  })

  
});




app.listen(3000 , function(){
    console.log("server started and running on port 3000")
});