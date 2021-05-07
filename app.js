const express = require('express');

//Path to the admin file
const adminPaths = require('./routes/admin');
const storePaths = require('./routes/store');
const authPaths = require('./routes/auth');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash');

const User = require('./models/user');

//MongoDB cluster URI
const MONGODB_URI =
  'mongodb+srv://Ayaan:brick123@cluster0.3oel9.mongodb.net/store';

const app = express();

const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
  });

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({extended: false}));

app.use(
    session({
      secret: 'my secret',
      resave: false,
      saveUninitialized: false,
      store: store
    })
);

app.use(flash());

app.use((req, res, next) => {
    if (!req.session.user) {
      return next();
    }
    User.findById(req.session.user._id)
      .then(user => {
        if(!user){
          return next();
        }
        req.user = user;
        next();
      })
      .catch(err => {
        throw new Error(err);
      });
  });

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    next();
});

//To access pages that are present in the admin file
app.use('/admin', adminPaths);
app.use(storePaths);
app.use(authPaths);


//Send an error message if the user tries to access a non-existent page
app.use((req, res, next) => {
    res.status(404).render('404', {
        title: 'Error',
        isAuthenticated: req.session.isLoggedIn
    });
});

//connecting to mongoDB cluster
mongoose.connect(MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(result => {
        app.listen(3000);
    }).catch(err => {
        throw err;
});
