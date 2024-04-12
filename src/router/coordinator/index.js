
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
 router.get("/coordinator-edit-post/:article_id", async (req, res) => {
    const connection = await pool.getConnection();
    const article_id = req.params.article_id;
    const [rows] = await connection.query(
        "SELECT * FROM post WHERE article_id = ?",
        [article_id]
    );
    connection.release();
    res.render("coordinator/coordinator-edit-post", { title: "Edit article", article: rows[0] });
});
router.post("/coordinator-edit-post/:article_id", upload.single("file"), async (req, res) => {
        if (req.file) {
            const file = req.file.filename;
            const { title, content } = req.body;
            const { article_id } = req.params;
            const connection = await pool.getConnection();
            const [rows] = await connection.query(
                "UPDATE post SET article_title= ?, article_content= ?, article_file= ? WHERE article_id= ?",
                [title, content, file, article_id]
            );
            connection.release();
            return res.redirect("/coordinator/coordinator-manage-post");
        }
        const { title, content, file_old } = req.body;
        const { article_id } = req.params;
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            "UPDATE post SET article_title= ?, article_content= ?, article_file= ? WHERE article_id= ?",
            [title, content, file_old, article_id]
        );
        connection.release();
        return res.redirect("/coordinator/coordinator-manage-post");
    });

    router.get("/coordinator-view-post/:post_id", async (req, res) => {
        const connection = await pool.getConnection();
        const post_id = req.params.post_id;
        const [rows0] = await connection.query(
            "SELECT * FROM Comment INNER JOIN departmentManager ON Comment.author_id = departmentManager.department_manager_id INNER JOIN post ON post.article_id = Comment.article_id WHERE post.article_id = ?",
            [post_id]
        );
        const [rows] = await connection.query(
            "SELECT * FROM post INNER JOIN student ON student.student_id = post.article_author_id WHERE post.article_id = ?",
            [post_id]
        );
        const [rows1] = await connection.query(
            "SELECT * FROM post WHERE article_id = ?",
            [post_id]
        );
        connection.release();
        console.log(rows);
        res.render("coordinator/coordinator-view-post", {
            title: "View detail article",
            post: rows1[0],
            author: rows[0],
            comments: rows0,
        });
    });
    

 router.post("/set-default-page/:article_id", async (req, res)=> {
    const article_id= req.params.article_id
    const connection = await pool.getConnection();
    const [rows1] = await connection.query("UPDATE post SET article_default= 1 WHERE article_id= ? ", article_id);
    connection.release();
    return res.json({success: true})
})
router.post("/unset-default-page/:article_id", async (req, res)=> {
    const article_id = req.params.article_id;
    const connection = await pool.getConnection();
    const [rows1] = await connection.query("UPDATE post SET article_default = 0 WHERE article_id = ? ", [article_id]);
    connection.release();
    return res.json({ success: true });
});

module.exports = router;

