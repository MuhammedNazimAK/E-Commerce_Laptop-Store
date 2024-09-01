const bcrypt = require('bcrypt');
const Admin = require('../../models/adminModel');
const User = require('../../models/userModel');

const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');


const loadAdminLoginPage = async (req, res) => {
    try {
        res.render('admin/adminLogin', { message: req.session.message || null });
        delete req.session.message; // Clear the message after rendering
    } catch (error) {
        console.log(error.message);
        res.render('admin/adminLogin', { message: 'An error occurred' });
    }
};

const   verifyAdminCredentials = async (req, res) => {
    const { email, password } = req.body;
    const errors = {};
    let generalError = null;

    try {
        if (!email) {
            errors.email = "Email is required";
        }

        if (!password) {
            errors.password = "Password is required";
        }

        // If there are validation errors, render the login page with errors
        if (Object.keys(errors).length > 0) {
            return res.render('admin/adminLogin', { errors });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.render('admin/adminLogin', { generalError: "Admin does not exist" });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.render('admin/adminLogin', { generalError: "Email or password is incorrect" });
        }

        req.session.admin = admin;
        res.redirect('/admin/dashboard');

    } catch (error) {
        console.error(error);
        res.render('admin/adminLogin', { generalError: "Internal server error" });
    }
};

// Load the admin dashboard
const loadAdminDashboard = (req, res) => {
    try {
        return res.status(200).render('admin/dashboard');
    } catch (error) {
        console.error("Error while loading admin dashboard:", error.message);
        return res.status(500).send("Internal server Error");
    }
};

// Load the list of users
const loadCustomersList = async (req, res) => {
    const pageNumber = parseInt(req.query.page || 1);
    const perPageData = 20; 

    try {
        const totalUsers = await User.countDocuments();
        const userData = await User.find({})
            .skip((pageNumber - 1) * perPageData)
            .limit(perPageData)
            .exec();
        const totalPages = Math.ceil(totalUsers / perPageData);

        return res.status(200).render('admin/customers', { userData, totalPages, currentPage: pageNumber });
    } catch (error) {
        console.error("Error while loading users:", error.message);
        return res.status(500).send("Internal server Error");
    }
};

// Toggle user block status
const toggleUserBlockStatus = async (req, res) => {
    console.log('came to the block button');
    const userId = req.query.userId;

    try {
        console.log(`Attempting to toggle block status for user ID: ${userId}`);
        const user = await User.findById(userId);
        if (!user) {
            console.error(`User not found: ${userId}`);
            return res.status(404).send('User not found');
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        console.log(`User block status successfully toggled for user ID: ${userId}`);
        const message = user.isBlocked ? "User successfully blocked" : "User successfully unblocked";
        return res.status(200).json({ success: true, message, user });
    } catch (error) {
        console.error("Error while toggling user block status:", error.message);
        return res.status(500).send("Internal server Error");
    }
};


const logoutAdmin = (req, res) => {
    try {
        req.session.destroy(err => {
            if(err) {
                console.error("Error while logging out admin:", err.message);
                return res.redirect('/pageNotFound');
            }
        });
        setTimeout(() => {
            res.redirect('/admin/login');
        }, 1000);
    } catch (error) {
        console.error("Error while logging out admin:", error.message);
        res.status(500).send("Internal server Error");
    }
}
 

// Dashboard data
const getDashboardData = async (req, res) => {
    try {
        const totalRevenue = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalCategories = await Category.countDocuments();

        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthlyEarning = await Order.aggregate([
            { $match: { status: 'Delivered', createdAt: { $gte: firstDayOfMonth } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        // Generate sample data for charts (replace with actual data in production)
        const saleStatistics = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            values: [65, 59, 80, 81, 56, 55]
        };

        const revenueByArea = {
            labels: ['North', 'South', 'East', 'West'],
            values: [300, 250, 200, 150]
        };

        res.json({
            totalRevenue: totalRevenue[0]?.total || 0,
            totalOrders,
            totalProducts,
            totalCategories,
            monthlyEarning: monthlyEarning[0]?.total || 0,
            saleStatistics,
            revenueByArea
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
};

const getLatestOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        let query = {};

        if (req.query.category) {
            const category = await Category.findOne({ name: req.query.category });
            if (category) {
                query['products.product'] = { $in: await Product.find({ category: category._id }).distinct('_id') };
            }
        }

        if (req.query.date) {
            const date = new Date(req.query.date);
            query.createdAt = {
                $gte: date,
                $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
            };
        }

        if (req.query.status) {
            query.status = req.query.status;
        }

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'firstName lastName')
            .populate('products.product', 'name');

        const formattedOrders = orders.map(order => ({
            _id: order._id,
            orderId: order.orderId,
            billingName: `${order.userId.firstName} ${order.userId.lastName}`,
            createdAt: order.createdAt,
            total: order.total,
            status: order.status,
            paymentMethod: order.paymentMethod
        }));

        res.json({
            orders: formattedOrders,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching latest orders:', error);
        res.status(500).json({ message: 'Error fetching latest orders' });
    }
};



module.exports = {
    loadAdminLoginPage,
    verifyAdminCredentials,
    loadAdminDashboard,
    loadCustomersList,
    toggleUserBlockStatus,
    logoutAdmin,
    getDashboardData,
    getLatestOrders,
};
