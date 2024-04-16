const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const checkLoggedIn = require("../../middleware/checkLogin");

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "../../uploads"));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const upload = multer({ storage: storage });

//config database
const dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "lms",
};
const pool = mysql.createPool(dbConfig);

router.use(checkLoggedIn)

router.get("/coordinator-page", async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const department_id = req.cookies.uid;
        const [coordinatorInfo] = await connection.query(
            "SELECT manager_name, faculty.department_name FROM departmentmanager INNER JOIN faculty ON departmentmanager.department_id = faculty.department_id WHERE department_manager_id = ?",
            [department_id]
        );
        connection.release();
        const manager_name = coordinatorInfo[0].manager_name;
        const facultyName = coordinatorInfo[0].department_name;
        res.render("coordinator/coordinator-page", { title: "Coordinator", manager_name, facultyName });
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ err: "Database query error" });
    }
});

//manage student
router.get("/coordinator-manage-student", async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const manager_id = req.cookies.uid;
        const [rows0] = await connection.query(
            "SELECT * FROM departmentManager INNER JOIN faculty ON faculty.department_id = departmentManager.department_id WHERE departmentManager.department_manager_id= ?",
            [manager_id]
        );
        const department_id = rows0[0].department_id;
        const [rows] = await connection.query(
            "SELECT student.*, faculty.department_name FROM student LEFT JOIN faculty ON student.student_department_id = faculty.department_id WHERE student.student_department_id = ? ORDER BY student.student_name",
            [department_id]
        );

        connection.release();
        res.render("coordinator/coordinator-manage-student", {
            title: "Student manager",
            students: rows,
        });
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).send("Error fetching students. Please try again later.");
    }
});

//manage post
router.get("/coordinator-manage-post", async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const manager_id = req.cookies.uid;
        const [rows0] = await connection.query(
            "SELECT * FROM departmentManager INNER JOIN faculty ON faculty.department_id = departmentManager.department_id WHERE departmentManager.department_manager_id= ?",
            [manager_id]
        );
        const [rows] = await connection.query(
            "SELECT * FROM post INNER JOIN student ON post.article_author_id = student.student_id WHERE student.student_department_id= ? ORDER BY student.student_name",
            [rows0[0].department_id]
        );
        connection.release();
        console.log(rows);
        res.render("coordinator/coordinator-manage-post", { title: "Post manager", posts: rows });
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).send("Error fetching posts. Please try again later.");
    }
});

//edit post
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

//view detail post
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

//add comment
router.post('/addComment/:article_id', async (req, res) => {
    try {
        const author_id = req.cookies.uid;
        const article_id = req.params.article_id;
        const { content } = req.body;
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            "INSERT INTO Comment(author_id, content, article_id, time_created) VALUES(?, ?, ?, ?)",
            [author_id, content, article_id, new Date().toString()]
        );

        connection.release()

        res.status(200).json({ message: 'Comment added successfully' });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Failed to add comment' });
    }
});
router.get('/api/comments/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;

        const connection = await pool.getConnection();
        const [comments] = await connection.query(
            "SELECT * FROM Comment INNER JOIN departmentManager ON departmentManager.department_manager_id = Comment.author_id WHERE Comment.article_id= ?",
            [postId]
        );
        connection.release()
        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Failed to fetch comments' });
    }
});

//set default
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

//manage faculty
router.get("/coordinator-manage-faculty", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * from faculty");
    res.render("coordinator/coordinator-manage-faculty", { title: "Manage Faculty", departments: rows });
});

//add faculty
router.get("/coordinator-add-faculty", async (req, res) => {
    res.render("coordinator/coordinator-add-faculty");
});
router.post("/coordinator-add-faculty", async (req, res) => {
    const connection= await pool.getConnection()
    const {name }= req.body
    const [result] = await connection.execute('INSERT into faculty(department_name) VALUES (?)', [name]);
    await connection.release();
    res.redirect("/coordinator/coordinator-manage-faculty");
});

//edit faculty
router.get("/coordinator-edit-faculty/:facultyId", async (req, res) => {
    const connection = await pool.getConnection();
    const facultyId = req.params.facultyId;
    const [rows] = await connection.query(
        "SELECT * from faculty WHERE department_id= ?",
        [facultyId]
    );
    console.log(rows[0]);
    res.render("coordinator/coordinator-edit-faculty", {
        title: "Update Faculty",
        department: rows[0],
    });
});
router.post("/coordinator-edit-faculty/:facultyId", async (req, res)=> {
    const connection= await pool.getConnection()
    const facultyId= req.params.facultyId
    const {name }= req.body
    const [rows]= await connection.query('update faculty SET department_name= ? WHERE department_id= ?', [name, facultyId])
    res.redirect("/coordinator/coordinator-manage-faculty");
})

//delete faculty
router.post("/coordinator-delete-faculty/:facultyId", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("DELETE FROM faculty WHERE department_id = ?", [req.params.facultyId]);
    connection.release()
    res.redirect("/coordinator/coordinator-manage-faculty");
});

module.exports = router;


