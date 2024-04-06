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
    // database: "lmsUpdate",
};
const pool = mysql.createPool(dbConfig);

router.use(checkLoggedIn)

router.get("/marketing_page", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    connection.release();
    res.render("marketing/marketing_page", {title: "Marketing"});
});


module.exports = router;
