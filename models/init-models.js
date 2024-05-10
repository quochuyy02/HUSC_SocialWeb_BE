var DataTypes = require('sequelize').DataTypes;
var _Comments = require('./comments');
var _Followers = require('./followers');
var _Likes = require('./likes');
var _Posts = require('./posts');
var _User_saved_posts = require('./user_saved_posts');
var _Users = require('./users');

function initModels(sequelize) {
  var Comments = _Comments(sequelize, DataTypes);
  var Followers = _Followers(sequelize, DataTypes);
  var Likes = _Likes(sequelize, DataTypes);
  var Posts = _Posts(sequelize, DataTypes);
  var User_saved_posts = _User_saved_posts(sequelize, DataTypes);
  var Users = _Users(sequelize, DataTypes);

  Posts.belongsToMany(Users, {
    as: 'user_id_Users',
    through: Likes,
    foreignKey: 'post_id',
    otherKey: 'user_id',
  });
  Posts.belongsToMany(Users, {
    as: 'user_id_Users_User_saved_posts',
    through: User_saved_posts,
    foreignKey: 'post_id',
    otherKey: 'user_id',
  });
  Users.belongsToMany(Posts, {
    as: 'post_id_Posts',
    through: Likes,
    foreignKey: 'user_id',
    otherKey: 'post_id',
  });
  Users.belongsToMany(Posts, {
    as: 'post_id_Posts_User_saved_posts',
    through: User_saved_posts,
    foreignKey: 'user_id',
    otherKey: 'post_id',
  });
  Users.belongsToMany(Users, {
    as: 'following_id_Users',
    through: Followers,
    foreignKey: 'follower_id',
    otherKey: 'following_id',
  });
  Users.belongsToMany(Users, {
    as: 'follower_id_Users',
    through: Followers,
    foreignKey: 'following_id',
    otherKey: 'follower_id',
  });
  Comments.belongsTo(Posts, { as: 'post', foreignKey: 'post_id' });
  Posts.hasMany(Comments, { as: 'Comments', foreignKey: 'post_id' });
  Likes.belongsTo(Posts, { as: 'post', foreignKey: 'post_id' });
  Posts.hasMany(Likes, { as: 'Likes', foreignKey: 'post_id' });
  User_saved_posts.belongsTo(Posts, { as: 'post', foreignKey: 'post_id' });
  Posts.hasMany(User_saved_posts, {
    as: 'User_saved_posts',
    foreignKey: 'post_id',
  });
  Comments.belongsTo(Users, { as: 'user', foreignKey: 'user_id' });
  Users.hasMany(Comments, { as: 'Comments', foreignKey: 'user_id' });
  Followers.belongsTo(Users, { as: 'follower', foreignKey: 'follower_id' });
  Users.hasMany(Followers, { as: 'Followers', foreignKey: 'follower_id' });
  Followers.belongsTo(Users, { as: 'following', foreignKey: 'following_id' });
  Users.hasMany(Followers, {
    as: 'following_Followers',
    foreignKey: 'following_id',
  });
  Likes.belongsTo(Users, { as: 'user', foreignKey: 'user_id' });
  Users.hasMany(Likes, { as: 'Likes', foreignKey: 'user_id' });
  Posts.belongsTo(Users, { as: 'user', foreignKey: 'user_id' });
  Users.hasMany(Posts, { as: 'Posts', foreignKey: 'user_id' });
  User_saved_posts.belongsTo(Users, { as: 'user', foreignKey: 'user_id' });
  Users.hasMany(User_saved_posts, {
    as: 'User_saved_posts',
    foreignKey: 'user_id',
  });

  return {
    Comments,
    Followers,
    Likes,
    Posts,
    User_saved_posts,
    Users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
