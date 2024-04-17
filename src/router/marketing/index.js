const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const checkLoggedIn = require("../../middleware/checkLogin");
const path = require("path");
const fs = require("fs");
const archiver = require('archiver');


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

router.get("/marketing-page", async (req, res) => {
    const connection = await pool.getConnection();
    connection.release();
    res.render("marketing/marketing-page", {title: "Marketing"});
});


//dashboard
router.get("/dashboard", async (req, res) => {res.render("marketing/dashboard");});
router.get("/dashboardData", async (req, res) => {
    const connection = await pool.getConnection();

    const [studentCountRows] = await connection.execute(
        "SELECT COUNT(*) AS totalStudents FROM student"
    );
    const [deptManagerCountRows] = await connection.execute(
        "SELECT COUNT(*) AS totalDeptManagers FROM departmentManager"
    );
    const [makeringManagerCountRows] = await connection.execute(
        "SELECT COUNT(*) AS totalMarketingManagers FROM marketing"
    );
    const [facultyCountRows] = await connection.execute(
        "SELECT COUNT(*) AS faculty FROM faculty"
    );
    const [feedbackCountRows] = await connection.execute(
        "SELECT COUNT(*) AS comment FROM comment"
    );
    const [postCountRows] = await connection.execute(
        "SELECT COUNT(*) AS post FROM post"
    );
    const [magazineCountRows] = await connection.execute(
        "SELECT COUNT(*) AS magazine FROM magazine"
    );

    connection.release();
    res.json({
        totalStudents: studentCountRows[0].totalStudents,
        totalDeptManagers: deptManagerCountRows[0].totalDeptManagers,
        totalMarketingManagers: makeringManagerCountRows[0].totalMarketingManagers,
        totalFaculties: facultyCountRows[0].faculty,
        totalComments: feedbackCountRows[0].comment,
        totalPosts: postCountRows[0].post,
        totalMagazines: magazineCountRows[0].magazine
    });
});
router.get("/departmentData", async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const [departmentDataRows] = await connection.query(`
            SELECT f.department_name, COUNT(s.student_id) AS totalStudents, COUNT(c.id) AS totalComments
            FROM faculty f
            LEFT JOIN student s ON f.department_id = s.student_department_id
            LEFT JOIN Comment c ON s.student_id = c.author_id
            GROUP BY f.department_name
        `);

        res.json(departmentDataRows);
    } catch (error) {
        console.error("Error fetching department data:", error);
        res.status(500).json({ error: "An error occurred while fetching department data" });
    } finally {
        connection.release();
    }
});


module.exports = router;
