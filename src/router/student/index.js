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

router.get("/student_page", async (req, res) => {
    const connection = await pool.getConnection();
    const student_id = req.cookies.uid;
    connection.release();
    res.render("student/student_page", {title: "Student"});
});


module.exports = router;
