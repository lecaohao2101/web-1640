const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const checkLoggedIn = require("../../middleware/checkLogin");
const checkAdminRole = require("../../middleware/checkAdmin");

//config database
const dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "lms",
};
const pool = mysql.createPool(dbConfig);

router.use(checkLoggedIn)

router.get("/coordinator_page", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    connection.release();
    res.render("coordinator/coordinator_page", {title: "Coordinator"});
});

module.exports = router;
