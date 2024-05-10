module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    'Comments',
    {
      comment_id: {
        autoIncrement: true,
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
          model: 'Users',
          key: 'user_id',
        },
      },
      post_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'Posts',
          key: 'post_id',
        },
        onDelete: 'CASCADE',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'Comments',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'comment_id' }],
        },
        {
          name: 'user_id',
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
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
