const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const yup = require('yup');
const monk = require('monk');
const csp = require('helmet-csp')
const { nanoid } = require('nanoid');
const csv = require('csv-parser');
const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const csvtojson = require('csvtojson');
const brain = require('brain.js')

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
        scriptSrc: ["'self'", "'unsafe-eval'", 'cdnjs.cloudflare.com'],
        fontSrc: [
            "'self'", // Default policy for specifiying valid sources for fonts loaded using "@font-face": allow all content coming from origin (without subdomains).
            'https://fonts.gstatic.com',
            'https://cdnjs.cloudflare.com'
        ],
        styleSrc: [
            "'self'", // Default policy for valid sources for stylesheets: allow all content coming from origin (without subdomains).
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com'
        ],
    }
}));

app.use(morgan('tiny'));
app.use(cors());
app.use(express.json());
app.use(express.static('./public'));


app.get('/:id', async (req, res) => {
    const { id: slug } = req.params;
    try {
        const url = await urls.findOne({ slug });
        if (url) {
            res.redirect(url.url);
        }
        res.redirect(`/?error=${slug}-not-found`)
    }
    catch (error) {
        res.redirect('/?error=Link-not-found');
    }
});

const schema = yup.object().shape({
    slug: yup.string().trim().matches(/[\w\-]/i),
    url: yup.string().trim().url().required(),
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
        }
        const created = await urls.insert(newUrl);
        res.json({
            url: created.url,
            slug: created.slug
        });
    }
    catch (error) {
        next(error);
    }
});

app.use((error, req, res, next) => {
    if (error.status) {
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

/* ################################
        - This is the ML part -
   ################################ */

function buildTrainDataFromCSV() {
    fs.access('./trainData.json', (err) => {
        if (!err) {
            return;
        } else {
            csvtojson()
                .fromFile('./tripadvisor_hotel_reviews.csv')
                .then((json) => {
                    console.log('writing...');
                    fs.writeFileSync('trainData.json', JSON.stringify(json), 'utf-8', (err) => { if (err) console.log(err) })
                });
        }
    });
}

buildTrainDataFromCSV();

var trainData = require('./trainData.json');
var goodWordsCounter = 0;
var averageWordsCounter = 0;
var badWordsCounter = 0;
const goodWords = ['charmer', 'great', 'generous', 'spacious', 'clean', 'very clean', 'nice', 'amazingly', 'beautiful', 'amazing', 'classy', 'luxury', 'luxurious', 'awesome', 'wonderful', 'great', 'loved', 'love', 'excellent', 'easy', 'super', 'perfect', 'perf', 'pleasant', 'good', 'comfy', 'confortable', 'confortable', 'friendly', 'gorgeous', 'spacious', 'lovely', 'trendy', 'recommed', 'recommend', 'cozy', 'unique', 'exceptional', 'special', 'delicious', 'pretty', 'enjoyed', 'like', 'liked', 'pleasantly', 'positive', 'tidy', 'handy'];
const averageWords = ['fair', 'average', 'medium', 'not bad', 'kinda', 'kind of', 'decent', 'affordable', 'ok', 'o.k', 'o.k.', 'quite', 'overall', 'not world class', 'mediocre', 'adequate', 'common', 'resonable', 'ordinary', "regular", 'moderate', 'standard', 'tolerable', "not bad", 'simple', 'meh', 'decent experience', 'good overall experience', 'meh', 'idk', 'okay', 'convinient'];
const badWords = ['regretably', 'noisy', 'wrong', 'minus', 'bad', 'hate', 'broken', 'dirty', 'cold', 'disappointed', 'altered', 'stink', 'stinky', 'poor', 'awful', 'dreadful', 'garbage', 'gross', 'disgusting', 'rude', 'sad', 'horrible', 'noise', 'disappointment', 'reluctant', 'complaints', 'loud', "urine", "shit", "bullshit", "crap", "bugs", "insects", "terrible", 'sadly', 'shabby', 'cramped', 'overrated', 'limited', 'yuck', 'malfunctioned', 'disorganized', 'non functioning', 'rock', 'hard', 'annoying', 'bothered', 'lack', 'uncomfortable', 'not recommend', 'wouldn\'t recommend', 'worst'];

// trainData = trainData.map(trainData => ({
//     input: [trainData.Review],
//     output: [parseInt(trainData.Rating)]
// }));

function getWordsCounterInfo(item) {
    goodWordsCounter = 0;
    averageWordsCounter = 0;
    badWordsCounter = 0;
    goodWords.some(word => {
        if (item.Review.includes(word)) {
            goodWordsCounter++;
        }
    });
    averageWords.some(word => {
        if (item.Review.includes(word)) {
            averageWordsCounter++;
        }
    });
    badWords.some(word => {
        if (item.Review.includes(word)) {
            badWordsCounter++;
        }
    });
    return [goodWordsCounter, averageWordsCounter, badWordsCounter];
}

function mapTrainData(n) {
    var trainedDataAsTensor = [];
    var max = 0;
    trainData.forEach(item => {
        var result = getWordsCounterInfo(item);
        trainedDataAsTensor.push({ input: [result[0] / goodWords.length, result[1] / averageWords.length, result[2] / badWords.length], output: [parseFloat(parseInt(item.Rating) / 5)] });
        // max = item.Review.split(' ').length > max ? item.Review.split(' ').length : max;
    });
    // console.log(max)
    if (n) {
        return trainedDataAsTensor.slice(0, n);
    }
    return trainedDataAsTensor;
}

trainData = mapTrainData();
// console.log(trainData);

const network = new brain.NeuralNetwork();
network.train(trainData);

async function mapReviewAsTensor(review) {
    console.log(review);
    var result = getWordsCounterInfo({ Review: review });
    return await [result[0] / goodWords.length, result[1] / averageWords.length, result[2] / badWords.length];
}

app.post('/review/predict', async (req, res) => {
    const { review } = req.body;
    const input = await mapReviewAsTensor(review);
    console.log('input', input);
    try {
        const output = await network.run(await input);
        if (output) {
            res.json({
                output: output[0]
            })
        }
    }
    catch (err) {
        throw new Error('Error predicting this review');
    }
});