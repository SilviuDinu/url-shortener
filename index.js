const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const yup = require('yup');
const monk = require('monk');
const csp = require('helmet-csp')
const { nanoid } = require('nanoid');
const { nextTick } = require('process');

const app = express();

require('dotenv').config();


const db = monk(process.env.MONGODB_URI);

const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });

app.enable('trust proxy');

app.use(helmet());

app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'unpkg.com', 'cdn.jsdelivr.net',
            'fonts.googleapis.com', 'use.fontawesome.com'],
        scriptSrc: ["'self'", "'unsafe-eval'", 'cdnjs.cloudflare.com']
    }
}));

app.use(morgan('tiny'));
app.use(cors());
app.use(express.json());
app.use(express.static('./public'));


// app.get('/', (req, res) => { 
//     res.json({
//         message: 'This works 🍔'
//     })
// });

// app.get('/url/:id', (req, res) => {

//  });

const schema = yup.object().shape({
    slug: yup.string().trim().matches(/[\w\-]/i),
    url: yup.string().trim().url().required()
});

app.post('/url', async (req, res, next) => {
    let { slug, url } = req.body;
    try {
        await schema.validate({
            slug,
            url,
        });
        if (!slug) {
            slug = nanoid(4).toLowerCase();
        }
        const newUrl = {
            url,
            slug,
        };
        const created = await urls.insert(newUrl);
        res.json(created);
    }
    catch (error) {
        next(error);
    }
});

app.use((error, req, res, next) => {
    if(error.status){
        res.status(error.status);
    } else res.status(500);
    res.json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
    })
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log('Running on port ' + port);
});

