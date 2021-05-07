const express = require('express');

const router = express.Router();

const bcrypt = require('bcryptjs');

const User = require('../models/user');

//code to render login page
router.get('/login', (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0]; //error message that will be sent during validation errors
    }else{
        message = null;
    }
    res.render('login', {
        title: 'Login',
        path: '/login',
        errorMessage: message
    })
});

//code to render registration page
router.get('/signup', (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    }else{
        message = null;
    }
    res.render('signup', {
        title: 'Sign Up',
        path: '/signup',
        errorMessage: message
    })
});

router.post('/signup', (req, res, next) => {
    const email = req.body.email; //contains email of user
    const pw = req.body.pw; //contains password of user
    const cfpw = req.body.cfpw; //contains password of user

    User.findOne({email : email}) //check if this email already exists
    .then(UserDoc => {
        if(UserDoc){ //if this email id exists
            req.flash('error', 'Email already exists.'); //send an error message
            return res.redirect('/signup'); //then redirect user back to registration page
        }
        if(pw !== cfpw){ //if the password, and the confirm password fields don't match
            req.flash('error', 'Passwords do not match.'); //send an error message
            return res.redirect('/signup'); //then redirect user back to registration page
        }
        if(email === '' || pw === '' || cfpw === ''){ //if the password, and the confirm password fields don't match
            req.flash('error', 'Please fill missing fields.'); //send an error message
            return res.redirect('/signup'); //then redirect user back to registration page
        }
        //if email ID does not exist
        return bcrypt.hash(pw, 12).then(hashedPw => { //hash the user's password for privacy reasons

            const user = new User({ //create a new user
                email: email,
                password: hashedPw,
                cart: {items : []}
            });

            return user.save(); //add the user details to the database
        })
        .then(r => {
            res.redirect('/login'); //then redirect him to the login page
        });
    }).catch(err => { //if any error when saving to database, show the error
        throw err;
    });
});

router.post('/login', (req, res, next) => {
    const email = req.body.email; //contains user email
    const pw = req.body.pw; //contains user password

    User.findOne({email: email}).then(user => {
        if(!user){//if the email id does not exist
            req.flash('error', 'Email ID does not exist');//send an error message
            res.redirect('/login');//redirect him to login page
        }
        bcrypt.compare(pw, user.password).then(doMatch => {
            if(doMatch){//if the password matches the one in the database
                req.session.isLoggedIn = true;
                req.session.user = user; //log the user in
                return req.session.save(err => {
                    console.log(err);
                    return res.redirect('/products'); //redirect him to products
                });
            }
            req.flash('error', 'Password was wrong.');//if any error, send error message
            res.redirect('/login');
        }).catch(err => { //if any other error, show the error
            console.log(err)
            res.redirect('/login');
        })
    })
});

router.post('/logout', (req, res, next) => {
    req.session.destroy(err => { //destroy the login session once he clicks the 'Logout' button
        console.log(err);
        res.redirect('/');//redirect the user to home page after he logs out.
    });
});

module.exports = router;