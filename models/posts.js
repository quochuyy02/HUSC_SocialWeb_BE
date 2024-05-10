module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    'Posts',
    {
      post_id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        onDelete: 'CASCADE',
      },
      user_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
          model: 'Users',
          key: 'user_id',
        },
      },
      title: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      code: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      tags: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'Posts',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'post_id' }],
        },
        {
          name: 'fk_posts_user_id',
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
        },
      ],
    },
  );
};
