/* eslint-disable camelcase */

const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Sequelize = require('sequelize');
const axios = require('axios');

const sendEmail = require('../utils/email');
const { Users } = require('../models/models');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const { gt } = Sequelize.Op;

const signToken = (id, passwordVersion, ...info) =>
  jwt.sign({ id, passwordVersion, ...info }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
function generateRandomPassword(length) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const passwordArray = new Array(length);

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(characters.length);
    passwordArray[i] = characters.charAt(randomIndex);
  }

  return passwordArray.join('');
}
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    console.log(token);
  }
  if (!token)
    return next(
      new AppError('You are not allowed to access this. Please log in', 401),
    );

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const user_id = decoded.id;
  const currentUser = await Users.findOne({ where: { user_id: user_id } });
  if (!currentUser || currentUser.is_active === 1) {
    return next(new AppError('Users is longer exist'));
  }
  const timestamp = currentUser.passwordChangeAt;
  if (
    timestamp > decoded.iat ||
    decoded.passwordVersion !== currentUser.passwordVersion
  )
    return new AppError('User changed password. Please login again', 401);
  req.user = currentUser;
  next();
});
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to access this!', 403),
      );
    }
  };
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = {
    user_id: req.body.user_id,
    email: req.body.email,
    password: req.body.password,
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    profile_picture: req.body.profile_picture,
    bio: req.body.bio,
  };

  const result = await Users.create(newUser, {
    validate: true,
    returning: true,
  });
  res.status(200).json({ status: 'success', data: result });
});
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  const userInfo = await Users.findOne({ where: { email: email } });

  if (
    !userInfo ||
    !(await userInfo.checkPassword(password, userInfo.password))
  ) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //check if user is active
  if (!userInfo.is_active)
    return next(new AppError('This account was deactivated!', 401));
  //if everything ok, send token to client
  const token = signToken(userInfo.user_id, userInfo.passwordVersion);
  //Seend cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: false,
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  res.status(200).json({
    status: 'success',
    token,
  });
});
exports.googleSignIn = catchAsync(async (req, res, next) => {
  const { tokenId } = req.body;
  try {
    // Verify the Google token with Google API
    const googleResponse = await axios.post(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${tokenId}`,
    );

    const { sub, email, given_name, family_name, picture } =
      googleResponse.data;

    // if (!email.includes('@husc.edu.vn')) {
    //   res.status(400).json({
    //     status: 'failed',
    //     message: 'Please use education email (HUSC).',
    //   });
    //   return next(new AppError('Please use education email (HUSC).', 400));
    // }

    const user = await Users.findOne({ where: { email: email } });

    if (!user) {
      const initialPassword = generateRandomPassword(8);
      const newUser = {
        user_id: sub,
        email: email,
        password: initialPassword,
        first_name: given_name,
        last_name: family_name,
        profile_picture: picture,
        created_at: Date.now(),
      };
      await Users.create(newUser, {
        validate: true,
        returning: true,
      });
      const message = `Dear ${newUser.first_name} ${newUser.last_name},

      Welcome to our platform! Your account has been successfully created. Please use the following password to login: ${initialPassword}

      Please note that this is your initial password, and we highly recommend changing it after logging in for the first time.

      If you have any questions or need further assistance, please feel free to contact our support team.

      Best regards,
      ĐHKH Student Information Exchange Platform
      `;

      await sendEmail({
        email: newUser.email,
        subject: '[HUSC] Welcome to ĐHKH Social Web - Initial Password',
        message,
      });
      res.status(200).json({ status: 'success' });
    } else {
      return res
        .status(401)
        .json({ status: 'failed', message: 'This email is already in use!' });
    }
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    res.status(401).json({ error: 'Google Sign-In failed' });
  }
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await Users.findOne({ where: { email: email } });

  if (!user) {
    return next(new AppError('Email address is not registed!', 400));
  }
  const resetToken = user.createPasswordResetToken();

  await user.save();
  //3 send to email
  const resetURL = `${process.env.WEB_DOMAIN}/resetPassword/${resetToken}`;
  const message = `Dear ${user.first_name},\n\nWe received a request to reset your password. If you did not initiate this request, please ignore this email.\n\nTo reset your password, please click on the following link:\n\n${resetURL}\n\nThis link is valid for 10 minutes.\n\nThank you,\nThe Social Web Team`;

  try {
    await sendEmail({
      email: user.email,
      subject: '[HUSC] Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500,
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await Users.findOne({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        [gt]: Date.now(),
      },
    },
  });
  if (!user) {
    return next(
      new AppError('Invalid token or token has already expired!', 401),
    );
  }
  user.password = req.body.password;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully',
  });
});
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await Users.findOne({ where: { email: req.body.email } });
  if (!user) return next(new AppError("Can't found this user", 400));
  const check = await user.checkPassword(
    req.body.currentPassword,
    user.password,
  );
  if (!check) return next(new AppError('Password is not correct!!!', 401));
  user.password = req.body.newPassword;
  user.passwordChangedAt = Date.now();
  user.passwordVersion += 1;
  await user.save();
  res.status(200).json({ message: 'password changed successfully' });
});
exports.deactivateUser = catchAsync(async (req, res, next) => {
  const user = await Users.findOne({
    where: {
      user_id: req.user.user_id,
    },
  });

  await user.update({ is_active: 0 });
  res
    .status(200)
    .json({ status: 'success', message: 'Deactive successfully.' });
});

exports.verifyToken = async (token) => {
  if (!token) return null;
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const user_id = decoded.id;
  const currentUser = await Users.findOne({ where: { user_id: user_id } });
  if (!currentUser || currentUser.is_active === 1) {
    console.log('fail 1');
    return null;
  }
  const timestamp = currentUser.passwordChangeAt;
  if (
    timestamp > decoded.iat ||
    decoded.passwordVersion !== currentUser.passwordVersion
  ) {
    console.log('fail 2');
    return null;
  }

  return currentUser.get({ plain: true });
};
