require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
const mongoose = require('mongoose');
require('dotenv').config();

const conectDB =  async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error(err);
  }
}

module.exports = conectDB;