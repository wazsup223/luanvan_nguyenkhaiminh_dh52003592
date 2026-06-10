const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    category_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    category_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    parent_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Self-referencing (sub-categories)
  Category.associate = (models) => {
    Category.belongsTo(models.Category, { 
      foreignKey: 'parent_category_id', 
      as: 'parentCategory' 
    });
    Category.hasMany(models.Category, { 
      foreignKey: 'parent_category_id', 
      as: 'subCategories' 
    });
    // A Category has many Menu Items
    Category.hasMany(models.MenuItem, { 
      foreignKey: 'category_id', 
      as: 'menuItems' 
    });
  };

  return Category;
};
