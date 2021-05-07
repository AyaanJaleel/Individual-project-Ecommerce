const express = require('express');

const Product = require('../models/product');
//const isAuth = require('../middleware/is-auth');

//this function helps to connect to the other express app
const router = express.Router();

router.get('/add',(req, res, next) => {
    res.render('admin/add-product', {
        title: 'Add',
        path: '/admin/add',
        
    });
});

router.get('/products',(req, res, next) => {
    Product.find().then(products => {
        res.render('admin/products', {
            prods: products,
            title: 'Admin Products',
            path: '/admin/products'
        });
    }).catch(err => {
        console.log(err);
    })
});

router.post('/add', (req, res, next) => {
    const title = req.body.title;
    const price = req.body.price;
    const imageUrl = req.body.img;
    const desc = req.body.desc;

    const product = new Product({
        title: title, 
        price: price, 
        desc: desc, 
        userId: req.user,
        imageUrl: imageUrl
    });

    product
        .save()
        .then(result => {
            console.log('New Product added!');
            res.redirect('/products');
            return result;
        }).catch(err => {
            console.log(err);
        });
});

//allows you to export code that other files can use
module.exports = router;