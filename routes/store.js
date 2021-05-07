const express = require('express');
const fs = require('fs');
const path = require('path');

const Product = require('../models/product');
const Order = require('../models/order');
const date = require('date-and-time');
const PDFDocument = require('pdfkit');

const ITEMS_PER_PAGE = 6;

//this function helps to connect to the other express app
const router = express.Router();

router.get('/', (req, res, next) =>{
  res.render('home', {
    path: '/',
    pageTitle: 'Home'
  });
})

router.get('/products', (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find().countDocuments().then(numProducts => {
    totalItems = numProducts;
    //only show 6 products per page
    return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
  }).then(products => {
      res.render('store', {
        prods: products,
        title: 'Store',
        path: '/products',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
  }).catch(err => {
    //if any error, show the error
      console.log(err);
    })
});

router.get('/products/:productId', (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then(product => {
        res.render('product-detail', {
            product: product,
            title: product.title,
            path: '/products'
        });
    })
    .catch(err => {
        throw err;
    });
})

router.get('/cart', (req, res, next) => {
    req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => console.log(err));
});

router.post('/cart', (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId).then(product => {
        return req.user.addToCart(product);
    }).then(result => {
        console.log(result);
        res.redirect('/cart')
    })
});

router.post('/cart-item-delete', (req, res, next) => {
    const prodId = req.body.productId;
    req.user
      .removeFromCart(prodId)
      .then(result => {
        res.redirect('/cart');
      })
      .catch(err => console.log(err));
});

router.get('/search', (req, res, next) => {
  const products = [];
  res.render('search', {
    path: '/search',
    pageTitle: 'Search',
    products: products
  });
});

router.post('/search', (req, res, next) => {
  if(req.body.search === ''){
    res.redirect('/search');
  }else{
    Product.find({'title': { "$regex": req.body.search.toLowerCase() }})
    .then(products => {
      res.render('search', {
        path: '/search',
        pageTitle: 'Search',
        products: products
      });
    })
  }
});

router.get('/orders', (req, res, next) => {
    var name = req.user.email.split('@')[0];
    Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
        name: name
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
});

router.get('/orders/:orderId', (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId).then(order => {
    if(!order){
      return next(new Error('Order not found.'));
    }
    if(order.user.userId.toString() !== req.user._id.toString()){
      return next(new Error('Unauthorized access'));
    }
    const invoiceName = 'invoice-' + orderId + '.pdf';
    const invoicePath = path.join('data', 'invoices', invoiceName);

    const newPDF = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
    newPDF.pipe(fs.createWriteStream(invoicePath));
    newPDF.pipe(res);

    newPDF.fontSize(26).text('Invoice', {
      underline:true,
      align: 'center'
    });

    newPDF.text(' ');

    newPDF.fontSize(20).text('OrderID: ' + order._id);

    newPDF.text(' ');

    newPDF.fontSize(22).text('Name: ' + req.user.email.split('@')[0]);

    newPDF.text(' ');

    newPDF.fontSize(18).text('==================================');

    let total = 0;

    order.products.forEach(prod => {
      total += prod.quantity * prod.product.price;

      newPDF.fillColor('green').fontSize(18).text(prod.product.title + ' -   ' + prod.quantity + ' x ' + ' $' + prod.product.price);
      newPDF.text(' ');

    });

    newPDF.fillColor('black').text('==================================');

    newPDF.fillColor('black').fontSize(20).text('Total Price: $ ' + total);
    newPDF.text(' ');

    newPDF.fillColor('black').fontSize(19).text('Thank you for ordering from us!');

    newPDF.end();
  }).catch(err => next(err))
 
})

router.post('/create-order', (req, res, next) => {
  const now = new Date();
  let currentDate = date.format(now, 'ddd, MMM DD YYYY'); 

    req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        date: currentDate,
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
});


module.exports = router;