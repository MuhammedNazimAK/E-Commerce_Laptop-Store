const mongoose = require("mongoose");

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, required: true, trim: true },
    ram: {
      type: String,
      required: true,
      trim: true,
    },
    storage: {
      type: String,
      required: true,
      trim: true,
    },
    processor: {
      type: String,
      required: true,
      trim: true,
    },
    graphicsCard: { type: String, trim: true },
    categories: [{
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    }],
    color: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    salePrice: { type: Number },
    stock: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    views: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
