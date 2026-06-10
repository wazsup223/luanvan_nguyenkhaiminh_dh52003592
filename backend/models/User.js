const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      unique: true,
      validate: { isEmail: true }
    },
    phone: {
      type: DataTypes.STRING(20)
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('Customer', 'Waiter', 'Kitchen', 'Cashier', 'BranchManager', 'Admin'),
      allowNull: false
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Instance method: Check password
  User.prototype.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.password_hash);
  };

  // Hook: Hash password before create/update
  User.beforeCreate(async (user) => {
    if (user.password_hash && !user.password_hash.startsWith('$2b$')) {
      user.password_hash = await bcrypt.hash(user.password_hash, 10);
    }
  });

  User.beforeUpdate(async (user) => {
    if (user.changed('password_hash') && !user.password_hash.startsWith('$2b$')) {
      user.password_hash = await bcrypt.hash(user.password_hash, 10);
    }
  });

  // Associations
  User.associate = (models) => {
    // A User belongs to a Branch
    User.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
    // A User (Manager) manages a Branch
    User.hasOne(models.Branch, { foreignKey: 'manager_id', as: 'managedBranch' });
    // A User (Customer) has many Orders
    User.hasMany(models.Order, { foreignKey: 'user_id', as: 'orders' });
    // A User (Staff) processes many Orders
    User.hasMany(models.Order, { foreignKey: 'staff_id', as: 'processedOrders' });
    // A User has many Reviews
    User.hasMany(models.Review, { foreignKey: 'user_id', as: 'reviews' });
    // A User has many reward redemptions
    User.hasMany(models.UserReward, { foreignKey: 'user_id', as: 'rewardRedemptions' });
  };

  return User;
};
