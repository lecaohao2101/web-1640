
const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const checkLoggedIn = require("../../middleware/checkLogin");

//config database
const dbConfig = {
   host: "localhost",
   user: "root",
   password: "",
   database: "lms",
};
const pool = mysql.createPool(dbConfig);

router.use(checkLoggedIn)

router.get("/coordinator_page", async (req, res) => {
   const connection = await pool.getConnection();
   connection.release();
   res.render("coordinator/coordinator_page", {title: "Coordinator"});
});

//manage student
router.get("/coordinator_manage_student", async (req, res) => {
   const connection = await pool.getConnection();
   const manager_id = req.cookies.uid;
   const [rows0] = await connection.query(
       "SELECT * FROM departmentManager INNER JOIN faculty ON faculty.department_id = departmentManager.department_id WHERE departmentManager.department_manager_id= ?",
       [manager_id]
   );
   const department_id = rows0[0].department_id;
   const [rows] = await connection.query(
       "SELECT * FROM student WHERE student_department_id = ?",
       [department_id]
   );
   connection.release();
   res.render("coordinator/coordinator_manage_student", {
       title: "Student manager",
       students: rows,
   });
});

//manage post
router.get("/coordinator_manage_post", async (req, res) => {
    const connection = await pool.getConnection();
    const manager_id = req.cookies.uid;
    const [rows0] = await connection.query(
        "SELECT * FROM departmentManager INNER JOIN faculty ON faculty.department_id = departmentManager.department_id WHERE departmentManager.department_manager_id= ?",
        [manager_id]
    );
    const [rows] = await connection.query(
        "SELECT * FROM post INNER JOIN student ON post.article_author_id = student.student_id WHERE student.student_department_id= ?",
        [rows0[0].department_id]
    );
    connection.release();
    console.log(rows);
    res.render("coordinator/coordinator_manage_post", { title: "Post manager", posts: rows });
 });
 
module.exports = router;

