const express = require('express');
const moment = require('moment');
const multer = require('multer');
const usersController = require('../controllers/userController');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/signin', authController.signup);
router.post('/login', authController.login);
router.route('/googleSignIn').post(authController.googleSignIn);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.post(
  '/updatePassword',
  authController.protect,
  authController.updatePassword,
);
router.patch(
  '/deactivateAccount',
  authController.protect,
  authController.deactivateUser,
);
router
  .route('/getAllUsers')
  .get(
    authController.protect,
    authController.restrictTo(['admin']),
    usersController.getAllUser,
  );
router.get(
  '/getProfile/:id?',
  authController.protect,
  usersController.getProfile,
);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
router.post(
  '/updateProfile',
  authController.protect,
  upload.single('profile_picture'),
  usersController.updateProfile,
);
router.post('/follow', authController.protect, usersController.followUser);
router.post('/unfollow', authController.protect, usersController.unfollowUser);
router.get('/getInfoList', authController.protect, usersController.getInfoList);
router.get(
  '/search',
  authController.protect,
  usersController.searchUser,
);

module.exports = router;
