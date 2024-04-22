const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");

//config database
const dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "lms",
    // database: "lmsUpdate",
};
const pool = mysql.createPool(dbConfig);

router.get("/faculty/:facultyName", async (req, res) => {
    const { facultyName } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
        "SELECT * FROM post WHERE article_default = 1 AND faculty_name = ?",
        [facultyName]
    );
    connection.release();
    res.render("faculty_posts", { title: `${facultyName} Posts`, posts: rows });
});

router.get("/", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM faculty");
    connection.release();
    res.render("home", { title: "Home page", faculties: rows });
});

