const { Sequelize } = require('sequelize');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const initModel = require('./init-models');

const databaseName = process.env.DATABASE_NAME;

const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const PORT = process.env.DATABASE_PORT || 3306;
const sequelize = new Sequelize(databaseName, username, password, {
  host: 'social-web.ctlskvoaafuc.ap-southeast-1.rds.amazonaws.com',
  dialect:
    'mysql' /* one of 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'db2' | 'snowflake' | 'oracle' */,
  port: PORT,
  password: password,
  // pool: {
  //   max: 10,
  //   idle: 30000,
  //   acquire: 30000,
  // },
  define: {
    timestamps: false,
  },
});
//Define model
const { Users, Posts, Comments, Likes, Followers, User_saved_posts } =
  initModel(sequelize);
sequelize.addHook('beforeCount', function (options) {
  if (this._scope.include && this._scope.include.length > 0) {
    options.distinct = true;
    options.col =
      this._scope.col || options.col || `"${this.options.name.singular}".id`;
  }

  if (options.include && options.include.length > 0) {
    options.include = null;
  }
});
//Define relationship
sequelize.addHook('beforeCount', function (options) {
  if (this._scope.include && this._scope.include.length > 0) {
    options.distinct = true;
    options.col =
      this._scope.col || options.col || `"${this.options.name.singular}".id`;
  }

  if (options.include && options.include.length > 0) {
    options.include = null;
  }
});
Users.addHook('beforeCreate', async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 12);
    user.passwordChangedAt = Date.now();
  }
});
Users.addHook('beforeUpdate', async (user) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 12);
    user.passwordChangedAt = Date.now();
  }
});

Users.prototype.checkPassword = async (candidatePassword, userPassword) =>
  await bcrypt.compare(candidatePassword, userPassword);
Users.prototype.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

Users.removeAttribute('id');
Posts.removeAttribute('id');
Comments.removeAttribute('id');

module.exports = {
  sequelize,
  Users,
  Posts,
  Comments,
  Likes,
  Followers,
  User_saved_posts,
  sequelize,
};
