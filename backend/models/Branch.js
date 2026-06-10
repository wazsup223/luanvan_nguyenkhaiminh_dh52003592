const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Branch = sequelize.define('Branch', {
    branch_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    branch_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20)
    },
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'branches',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Branch.associate = (models) => {
    // A Branch has many Users (staff)
    Branch.hasMany(models.User, { foreignKey: 'branch_id', as: 'staff' });
    // A Branch belongs to a Manager (User)
    Branch.belongsTo(models.User, { foreignKey: 'manager_id', as: 'manager' });
    // A Branch has many Menu Items
    Branch.hasMany(models.MenuItem, { foreignKey: 'branch_id', as: 'menuItems' });
    // A Branch has many Orders
    Branch.hasMany(models.Order, { foreignKey: 'branch_id', as: 'orders' });
    // A Branch has many Inventory Items
    Branch.hasMany(models.InventoryItem, { foreignKey: 'branch_id', as: 'inventory' });
  };

  return Branch;
};
