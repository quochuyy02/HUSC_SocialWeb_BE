const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    'Likes',
    {
      user_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Users',
          key: 'user_id',
        },
      },
      post_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Posts',
          key: 'post_id',
        },
        onDelete: 'CASCADE',
      },
    },
    {
      sequelize,
      tableName: 'Likes',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'user_id' }, { name: 'post_id' }],
        },
        {
          name: 'post_id',
          using: 'BTREE',
          fields: [{ name: 'post_id' }],
        },
      ],
    },
  );
};
