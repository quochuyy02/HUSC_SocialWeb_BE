const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Followers', {
    follower_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Users',
        key: 'user_id'
      }
    },
    following_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Users',
        key: 'user_id'
      }
    }
  }, {
    sequelize,
    tableName: 'Followers',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "follower_id" },
          { name: "following_id" },
        ]
      },
      {
        name: "fk_followers_following_id",
        using: "BTREE",
        fields: [
          { name: "following_id" },
        ]
      },
    ]
  });
};
