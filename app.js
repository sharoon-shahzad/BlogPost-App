const express = require("express");
const app = express();
const path = require("path");
// requiring the userModel and postModel
const userModel = require("./models/user");
const postModel = require("./models/post");
// json and urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ejs
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// third-party libraries
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const user = require("./models/user");
const upload = require("./config/multerConfig");
app.use(cookieParser());

app.get("/", async (req, res) => {
  try {
    let users = await userModel.find().populate("post");
    res.render("index", { users });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

app.get("/signup",(req,res)=>
{
  res.render("signup");
});

app.post("/register", async (req, res) => {
  const { username, name, age, email, password } = req.body;
  let findedUser = await userModel.findOne({ email: email });
  if (findedUser) {
    return res.status(400).send("User already exists");
  } else {
    bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash(password, salt, async (err, hash) => {
        // Store hash in your password DB.
        let userCreated = await userModel.create({
          username: username,
          name: name,
          age: age,
          email: email,
          password: hash,
        });
        let jwtToken = jwt.sign(
          { email, userid: userCreated._id },
          "secretKey"
        );
        res.cookie("token", jwtToken, { httpOnly: true });
        console.log(userCreated);
        res.render("login");
      });
    });
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let findUser = await userModel.findOne({
    email: email,
  });
  if (!findUser) {
    return res.status(500).send("User not found");
  }
  bcrypt.compare(password, findUser.password, function (err, result) { // bcrypt is asynchronous function do remember that
    if (result) {
      let jwtToken = jwt.sign({ email, userid: findUser._id }, "secretKey");
      res.cookie("token", jwtToken, { httpOnly: true });
      // Retrieve the user data before rendering the profile page
      userModel
        .findOne({ email: email })
        .populate("post")
        .then((user) => {
          res.status(200).render("profile", { user: user });
        })
        .catch((err) => {
          console.error("Error retrieving user data:", err);
          res.redirect("/login");
        });
    } else {
      console.log("login failed, oops something went wrong");
      res.redirect("/login");
    }
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("token"); // Specify the name of the cookie to clear
  res.redirect("/"); // Redirect to the login page
});

app.get("/profile", isLoggedIn, async (req, res) => {
  try {
    // Retrieve the user data and populate the posts
    let user = await userModel.findOne({ email: req.user.email }).populate("post");
    res.render("profile", { user: user });
  } catch (error) {
    console.error("Error retrieving user data:", error);
    res.status(500).send("Error retrieving user data");
  }
});


app.post("/post", upload.single("image"), isLoggedIn, async (req, res) => {
  try {
    // Find the logged-in user
    let user = await userModel.findOne({ email: req.user.email });

    // Get the data from the form to create the post
    const { title, content, postpic } = req.body;
    // Create the post for the user
    let post = await postModel.create({
      title,
      content,
      postpic: req.file ? req.file.filename : null,
    });
    console.log(post);
    // Add the created post's ID to the user's posts array
    user.post.push(post._id);

    // Save the user with the new post reference
    await user.save();

    // Redirect to the profile
    res.redirect("/profile");
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).send("Error creating post");
  }
});
app.get("/post/data/:id",isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email }).populate("post");
  console.log(user);
  res.render("postdata", { user: user });
})
// app.get("/post/data/:id", isLoggedIn, async (req, res) => {
//   try {
//     let post = await postModel.findById(req.params.id).populate("user");
//     if (!post) {
//       return res.status(404).send("Post not found");
//     }
//     res.render("postdata", { post });
//   } catch (error) {
//     console.error("Error retrieving post data:", error);
//     res.status(500).send("Error retrieving post data");
//   }
// });

app.get("/like/:id", isLoggedIn, async (req, res) => {
  try {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");

    if (post.likes.indexOf(req.user.userid) === -1) {
      post.likes.push(req.user.userid);
    } else {
      post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save();
    res.redirect(`/post/data/${req.params.id}`);
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).send("Internal Server Error");
  }
});



// app.get("/like/:id", isLoggedIn , async (req,res)=>
// {
//   let post = await postModel.findOne({_id:req.params.id}).populate("user");
//   // res.send(req.user); checking if  recieved correct user which logged in

//   if(post.likes.indexOf(req.user.userid)=== -1)
//     {
//       post.likes.push(req.user.userid);
//     }
//   else
//   {
//     post.likes.splice(post.likes.indexOf(req.user.userid),1);
//   }

//   await post.save();
//   res.redirect(`/postdata/${req.params.id}`);
// })
app.get("/edit/:id", isLoggedIn, async (req, res) => {
  try {
    let findpost = await postModel.findOne({ _id: req.params.id });
    if (!findpost) {
      // Redirect to profile if the post is not found
      return res.redirect("/profile");
    }
    // Render the edit page if the post is found
    res.render("edit", { post: findpost, user: req.user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching post");
  }
});
app.post("/post/edited/:id", async (req, res) => {
  try {
    const { title, content } = req.body;
    let updatePost = await postModel.findOneAndUpdate(
      { _id: req.params.id },
      { title, content }
    );
    if (!updatePost) {
      return res.status(404).send("Post not found");
    }
    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating post");
  }
});
app.get("/delete/:id",async(req,res)=>
{
  const post = await postModel.deleteOne({_id:req.params.id});
  res.redirect("/profile");

})
function isLoggedIn(req, res, next) {
  if (!req.cookies.token) {
    // Redirect to login if there is no token
    return res.redirect("/login");
  }

  try {
    // Verify the token
    let data = jwt.verify(req.cookies.token, "secretKey");
    req.user = data;
    next();
  } catch (error) {
    // Handle the error if token verification fails
    console.error("Token verification failed:", error.message);
    return res.redirect("/login");
  }
}

app.get("/profile/img/upload",(req,res)=>
{
  res.render("profileimgupload")
})
app.post("/profileimgupload", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).send("Error uploading image");
  }
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
