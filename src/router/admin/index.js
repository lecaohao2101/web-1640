const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const checkLoggedIn = require("../../middleware/checkLogin");


const dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "lms",
};
const pool = mysql.createPool(dbConfig);

router.use(checkLoggedIn)

//login
router.post("/login", async (req, res) => {
    const connection = await pool.getConnection();
    const { email, password } = req.body;

    //admin
    const [rows] = await connection.query(
        "SELECT * FROM Admin WHERE admin_account = ? AND admin_password = ?",
        [email, password]
    );
    if (rows.length > 0) {
        res.cookie("uid", rows[0].id);
        res.cookie("role", "admin");
        connection.release();
        return res.redirect("admin/admin_page");
    }

    //coordinator
    const [rows1] = await connection.query(
      "SELECT * FROM departmentManager WHERE manager_email = ? AND manager_password = ?",
      [email, password]
    );
    if (rows1.length > 0) {
      res.cookie("uid", rows1[0].department_manager_id);
      res.cookie("role", "d_manager");
      connection.release();
      return res.redirect("coordinator/coordinator_page");
    }

    //marketing
    const [rows2] = await connection.query(
      "SELECT * FROM marketingManager WHERE manager_email = ? AND manager_password = ?",
      [email, password]
    );
    if (rows2.length > 0) {
      res.cookie("uid", rows2[0].marketing_id);
      res.cookie("role", "marketing");
      connection.release();
      return res.redirect("marketing/marketing_page");
    }

    //student
    const [rows3] = await connection.query(
        "SELECT * FROM student WHERE student_email = ? AND student_password= ?",
        [email, password]
    );
    if (rows3.length > 0) {
        res.cookie("uid", rows3[0].student_id);
        res.cookie("role", "student");
        connection.release();
        return res.redirect("student/student_page");
    }
    else {
        return res.send(
            "Account or password is incorrect or does not exist"
        );
    }
});


