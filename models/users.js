const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    'Users',
    {
      user_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      first_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      profile_picture: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      bio: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      passwordChangedAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: true,
        defaultValue: 'user',
      },
      passwordResetToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      passwordResetExpires: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 1,
      },
      passwordVersion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      nick_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'Users',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
        },
      ],
    },
  );
};
