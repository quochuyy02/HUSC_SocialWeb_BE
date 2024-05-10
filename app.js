/* eslint-disable import/no-extraneous-dependencies */
const express = require('express');
const morgan = require('morgan');
const hpp = require('hpp');
const compression = require('compression');
const cors = require('cors');
// eslint-disable-next-line import/no-extraneous-dependencies
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
//TODO: require Routers
const userRouter = require('./routes/userRoutes');
const postRouter = require('./routes/postRoutes');
const errorController = require('./controllers/errorController');

const app = express();
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://husc-student-info-exchange.netlify.app',
  ],

  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
// if (process.env.NODE_ENV !== 'production') {
app.use(morgan('dev'));
// }
app.use(compression());
app.use(helmet());
app.use(hpp());
app.use(express.json());
app.use((req, res, next) => {
  console.log('Hello from the middleware 👋');
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});
app.use('/user', userRouter);
app.use('/', postRouter);
app.use(
  '/uploads/profile_pictures',
  express.static('uploads/profile_pictures'),
);
// Set up rate limiter: maximum of 100 requests per minute
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
});

// Apply the rate limiting middleware to all routes
app.use(limiter);
app.use(errorController);
module.exports = app;
