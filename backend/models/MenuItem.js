const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MenuItem = sequelize.define('MenuItem', {
    item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true  // NULL = common for all branches
    },
    item_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    image_url: {
      type: DataTypes.STRING(500)
    },
    preparation_time: {
      type: DataTypes.INTEGER,
      defaultValue: 15
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'menu_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  MenuItem.associate = (models) => {
    // A MenuItem belongs to a Category
    MenuItem.belongsTo(models.Category, { 
      foreignKey: 'category_id', 
      as: 'category' 
    });
    // A MenuItem belongs to a Branch (optional)
    MenuItem.belongsTo(models.Branch, { 
      foreignKey: 'branch_id', 
      as: 'branch' 
    });
    // A MenuItem has many OrderItems
    MenuItem.hasMany(models.OrderItem, { 
      foreignKey: 'item_id', 
      as: 'orderItems' 
    });
    // A MenuItem has many MenuInventoryMappings
    MenuItem.hasMany(models.MenuInventoryMapping, { 
      foreignKey: 'item_id', 
      as: 'inventoryMappings' 
    });
    // A MenuItem has many Reviews
    MenuItem.hasMany(models.Review, { 
      foreignKey: 'item_id', 
      as: 'reviews' 
    });
  };

  return MenuItem;
};
