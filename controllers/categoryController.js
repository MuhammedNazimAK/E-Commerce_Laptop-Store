const Category = require('../models/categoryModel');
const CategoryOffer = require('../models/categoryOfferModel');
const { validationResult } = require('express-validator');


const loadCategoryManagementPage = (req, res) => {
    try {
        res.render('admin/categoryManagement');
    } catch (error) {
        console.error("Error loading category management page:", error);
        res.status(500).render('users/pageNotFound', { message: "Internal server error" });
    }
};



const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find({});
        res.status(200).json(categories); 
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: 'Server error' });
    }
};



const addNewCategory = async (req, res) => {
    const { name, description } = req.body;
    if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required' });
    }
    try {
        const newCategory = new Category({ name, description });
        await newCategory.save();
        res.status(201).json({ success: true, message: 'Category created successfully', category: newCategory });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


// Get a specific category
const getCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.json(category);
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({ error: 'Server error' });
    }
};



const editExistingCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { $set: { name, description } },
            { new: true }
        );
        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        return res.status(200).json({ success: true, message: "Category successfully edited", category: updatedCategory });
    } catch (error) {
        console.error("Error while editing category:", error.message);
        return res.status(500).json({ error: 'Server error' });
    }
};



const softDeleteCategory = async (req, res) => {
    const categoryId = req.query.categoryId;
    try {
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { $set: { isBlocked: !category.isBlocked } },
            { new: true }
        );
        const message = category.isBlocked ? "Category successfully restored" : "Category successfully deleted";
        return res.status(200).json({ success: true, message, isBlocked: updatedCategory.isBlocked });
    } catch (error) {
        console.error("Error while soft deleting category:", error.message);
        return res.status(500).json({ error: 'Server error' });
    }
};


// Category Offer controller
const categoryOfferController = {

  getCategoryOffersPage: async (req, res) => {
    try {
      res.render('admin/category-offer-list');  
    } catch (error) {
        console.error("Error loading category offer page:", error);
        res.status(500).render('users/pageNotFound', { message: "Internal server error" });
    }
  },

  createCategoryOffer: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { offerName, category, discountPercentage, startDate, endDate } = req.body;

      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Check for overlapping offers
      const overlappingOffer = await CategoryOffer.findOne({
        category,
        $or: [
          { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
          { startDate: { $gte: startDate, $lte: endDate } },
          { endDate: { $gte: startDate, $lte: endDate } }
        ]
      });

      if (overlappingOffer) {
        return res.status(400).json({ message: 'An overlapping offer already exists for this category' });
      }

      const newOffer = new CategoryOffer({
        offerName,
        category,
        discountPercentage,
        startDate,
        endDate
      });

      await newOffer.save();
      res.status(201).json({ message: 'Category offer created successfully', offer: newOffer });
    } catch (error) {
      res.status(500).json({ message: 'Error creating category offer', error: error.message });
    }
  },

  getCategoryOfferById: async (req, res) => {
    try {
      const offer = await CategoryOffer.findById(req.params.id).populate('category', 'name');
      if (!offer) {
        return res.status(404).json({ message: 'Category offer not found' });
      }
      res.json(offer);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching category offer', error: error.message });
    }
  },

  updateCategoryOffer: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { offerName, category, discountPercentage, startDate, endDate, isActive } = req.body;

      const offer = await CategoryOffer.findById(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: 'Category offer not found' });
      }

      // Check if the category exists
      if (category) {
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
          return res.status(404).json({ message: 'Category not found' });
        }
      }

      // Check for overlapping offers (excluding the current offer)
      const overlappingOffer = await CategoryOffer.findOne({
        _id: { $ne: req.params.id },
        category: category || offer.category,
        $or: [
          { startDate: { $lte: endDate || offer.endDate }, endDate: { $gte: startDate || offer.startDate } },
          { startDate: { $gte: startDate || offer.startDate, $lte: endDate || offer.endDate } },
          { endDate: { $gte: startDate || offer.startDate, $lte: endDate || offer.endDate } }
        ]
      });

      if (overlappingOffer) {
        return res.status(400).json({ message: 'An overlapping offer already exists for this category' });
      }

      // Update the offer
      offer.offerName = offerName || offer.offerName;
      offer.category = category || offer.category;
      offer.discountPercentage = discountPercentage || offer.discountPercentage;
      offer.startDate = startDate || offer.startDate;
      offer.endDate = endDate || offer.endDate;
      offer.isActive = isActive !== undefined ? isActive : offer.isActive;

      await offer.save();
      res.json({ message: 'Category offer updated successfully', offer });
    } catch (error) {
      res.status(500).json({ message: 'Error updating category offer', error: error.message });
    }
  },

  deleteCategoryOffer: async (req, res) => {
    try {
      const offer = await CategoryOffer.findByIdAndDelete(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: 'Category offer not found' });
      }
      res.json({ message: 'Category offer deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting category offer', error: error.message });
    }
  }
};


const loadAddCategoryOfferPage = async (req, res) => {
    try {
        const categories = await Category.find({});
        res.status(200).render('admin/category-offer-add', { categories });
    } catch (error) {
        console.error("Error loading add category offer page:", error);
        res.status(500).render('users/pageNotFound', { message: "Internal server error" });
    }
};

const loadCategoryOfferPage = async (req, res) => {
  console.log('reached here loading category offer`')
    try {
      const offers = await CategoryOffer.find().populate('category', 'name');
        res.status(200).json({offers: offers});
    } catch (error) {
        console.error("Error loading category offer page:", error);
        res.status(500).render('users/pageNotFound', { message: "Internal server error" });
    }
};

module.exports = {
    loadCategoryManagementPage,
    getAllCategories,
    addNewCategory,
    getCategory,
    editExistingCategory,
    softDeleteCategory,
    ...categoryOfferController,
    loadAddCategoryOfferPage,
    loadCategoryOfferPage
};
