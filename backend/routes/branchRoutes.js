const express = require('express');
const router = express.Router();
const db = require('../models');
const Branch = db.Branch;

// GET /api/branches - Get all active branches
router.get('/', async (req, res) => {
  try {
    const branches = await Branch.findAll({
      where: { is_active: true },
      order: [['branch_id', 'ASC']]
    });
    res.json({ success: true, data: branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/branches/:id - Get branch by ID
router.get('/:id', async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.json({ success: true, data: branch });
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/branches/:id/hours - Get branch operating hours
router.get('/:id/hours', async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh' });
    }
    const hours = await db.BranchHoursSimple.findAll({
      where: { branch_id: req.params.id }
    });
    res.json({ success: true, data: hours });
  } catch (error) {
    console.error('Error fetching branch hours:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất giờ mở cửa', error: error.message, stack: error.stack });
  }
});

// POST /api/branches - Create new branch (Admin only)
router.post('/', async (req, res) => {
  try {
    const { branch_name, address, phone } = req.body;
    
    if (!branch_name || !address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch name and address are required' 
      });
    }

    const newBranch = await Branch.create({
      branch_name,
      address,
      phone,
      is_active: true
    });

    res.status(201).json({ success: true, data: newBranch });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/branches/:id - Update branch (Admin/BranchManager)
router.put('/:id', async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const { branch_name, address, phone, is_active } = req.body;
    
    await branch.update({
      branch_name: branch_name || branch.branch_name,
      address: address || branch.address,
      phone: phone || branch.phone,
      is_active: is_active !== undefined ? is_active : branch.is_active
    });

    res.json({ success: true, data: branch });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/branches/:id - Delete branch (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    // Soft delete (set is_active = false)
    await branch.update({ is_active: false });

    res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
