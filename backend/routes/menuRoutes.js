const express = require('express');
const router = express.Router();
const db = require('../models');
const MenuItem = db.MenuItem;
const Category = db.Category;

// GET /api/menu - Get all menu items (with filters)
router.get('/', async (req, res) => {
  try {
    const { 
      category_id, 
      branch_id, 
      is_available, 
      is_featured, 
      min_price, 
      max_price,
      search 
    } = req.query;

    // Build where clause
    const whereClause = {};
    if (category_id) whereClause.category_id = category_id;
    if (branch_id) whereClause.branch_id = branch_id;
    if (is_available !== undefined) whereClause.is_available = is_available === 'true';
    if (is_featured !== undefined) whereClause.is_featured = is_featured === 'true';
    if (min_price) whereClause.price = { [Op.gte]: parseFloat(min_price) };
    if (max_price) {
      whereClause.price = { 
        ...whereClause.price, 
        [Op.lte]: parseFloat(max_price) 
      };
    }
    if (search) {
      whereClause.item_name = { [Op.like]: `%${search}%` };
    }

    const menuItems = await MenuItem.findAll({
      where: whereClause,
      include: [{
        model: Category,
        as: 'category',
        attributes: ['category_id', 'category_name']
      }],
      order: [['item_name', 'ASC']]
    });

    // Flatten category_name into top-level for FE convenience
    const flat = menuItems.map(item => {
      const raw = item.toJSON ? item.toJSON() : item;
      return {
        ...raw,
        category_name: raw.category?.category_name || null
      };
    });

    res.json({ success: true, data: flat });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/menu/featured - Get featured items
router.get('/featured', async (req, res) => {
  try {
    const featuredItems = await MenuItem.findAll({
      where: { 
        is_featured: true,
        is_available: true 
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['category_id', 'category_name']
      }],
      limit: 10
    });

    res.json({ success: true, data: featuredItems });
  } catch (error) {
    console.error('Error fetching featured items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/menu/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ['category_id', 'category_name'],
      order: [['category_name', 'ASC']]
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/menu/category/:category_id - Get items by category
router.get('/category/:category_id', async (req, res) => {
  try {
    const items = await MenuItem.findAll({
      where: { 
        category_id: req.params.category_id,
        is_available: true 
      },
      include: [{
        model: Category,
        as: 'category'
      }]
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching items by category:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/menu/:id - Get menu item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id, {
      include: [{
        model: Category,
        as: 'category'
      }]
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/menu - Create new menu item (Admin/BranchManager)
router.post('/', async (req, res) => {
  try {
    const { 
      category_id, 
      branch_id, 
      item_name, 
      description, 
      price, 
      image_url, 
      preparation_time,
      is_available,
      is_featured 
    } = req.body;

    if (!category_id || !item_name || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category ID, item name, and price are required' 
      });
    }

    const newItem = await MenuItem.create({
      category_id,
      branch_id: branch_id || null,
      item_name,
      description,
      price,
      image_url,
      preparation_time: preparation_time || 15,
      is_available: is_available !== undefined ? is_available : true,
      is_featured: is_featured || false
    });

    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/menu/:id - Update menu item (Admin/BranchManager)
router.put('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const { 
      category_id, 
      branch_id, 
      item_name, 
      description, 
      price, 
      image_url, 
      preparation_time,
      is_available,
      is_featured 
    } = req.body;

    await item.update({
      category_id: category_id || item.category_id,
      branch_id: branch_id !== undefined ? branch_id : item.branch_id,
      item_name: item_name || item.item_name,
      description: description !== undefined ? description : item.description,
      price: price || item.price,
      image_url: image_url !== undefined ? image_url : item.image_url,
      preparation_time: preparation_time || item.preparation_time,
      is_available: is_available !== undefined ? is_available : item.is_available,
      is_featured: is_featured !== undefined ? is_featured : item.is_featured
    });

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/menu/:id - Delete menu item (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    // Soft delete (set is_available = false)
    await item.update({ is_available: false });

    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
