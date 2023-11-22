const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at 3000 port");
    });
  } catch (e) {
    console.log(e);
  }
};

initializeDBAndServer();
//MIDDLE-WEIR
const authenticate = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid jwt Token");
  } else {
    if (jwtToken !== undefined) {
      jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid jwt Token");
        } else {
          request.username = payload.username;
          next();
        }
      });
    }
  }
};

//API-1
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  console.log(request.body);
  const selectUserQuery = `SELECT * FROM user where username = "${username}";`;
  const dbUSer = await db.run(selectUserQuery);
  if (dbUSer !== undefined) {
    if (password.length > 6) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const addUserQuery = `INSERT INTO user(username,password,name,gender) VALUES("${username}","${hashedPassword}","${name}","${gender}");`;
      const addUser = await db.run(addUserQuery);
      const user_id = addUser.lastID;
      console.log(user_id);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API-2
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  console.log(request.body);
  const selectUserQuery = `SELECT * FROM user WHERE username = "${username}";`;

  const dbUSer = await db.get(selectUserQuery);
  if (dbUSer !== undefined) {
    const isPasswordMatched = await bcrypt.compare(password, dbUSer.password);
    console.log(isPasswordMatched);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = await jwt.sign(payload, "MY_SECRET_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("invalid Password");
    }
  } else {
    response.status(400);
    response.send("Invalid User");
  }
});

//API-3
app.get("/user/tweets/feed/", authenticate, async (request, response) => {
  const { username } = request;
  console.log(username);
  const getUserDbQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const getUserDb = await db.get(getUserDbQuery);

  if (getUserDb !== undefined) {
    const { user_id } = getUserDb;
    const getFollowerDbQuery = `SELECT * FROM follower where follower_id = ${user_id};`;
    const getFollowerDb = await db.get(getFollowerDbQuery);
    // response.send(getFollowerDb);
    if (getFollowerDb !== undefined) {
      const { following_user_id } = getFollowerDb;
      console.log(follower_user_id);
      const getTweetsDbQuery = `SELECT user.username ,tweet.user_id,tweet.tweet,tweet.date_time AS dateTime FROM tweet INNER JOIN user WHERE tweet.user_id = ${following_user_id} ORDER BY tweet.date_time DESC limit 4;`;
      const getTweetsDb = await db.all(getTweetsDbQuery);
      response.send(getTweetsDb);
    }
  }
});

//API-4
app.get("/user/following/", authenticate, async (request, response) => {
  const { username } = request;
  console.log(username);
  const getUserDbQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const getUserDb = await db.get(getUserDbQuery);
  if (getUserDb !== undefined) {
    const { user_id } = getUserDb;
    const getFollowerDbQuery = `SELECT * FROM follower where follower_id = ${user_id};`;
    const getFollowerDb = await db.get(getFollowerDbQuery);
    //response.send(getFollowerDb);
    if (getFollowerDb !== undefined) {
      const { following_user_id } = getFollowerDb;
      const getUserNameDbQuery = `SELECT name FROM user WHERE user_id = ${following_user_id};`;
      const getUserNameDb = await db.get(getUserNameDbQuery);
      response.send(getUserNameDb);
    }
  }
});

//API-5
app.get("/user/followers/", authenticate, async (request, response) => {
  const { username } = request;
  console.log(username);
  const getUserDbQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const getUserDb = await db.get(getUserDbQuery);
  if (getUserDb !== undefined) {
    const { user_id } = getUserDb;
    const getFollowerDbQuery = `SELECT * FROM follower where follower_id = ${user_id};`;
    const getFollowerDb = await db.get(getFollowerDbQuery);
    //response.send(getFollowerDb);
    if (getFollowerDb !== undefined) {
      const { follower_user_id } = getFollowerDb;
      const getUserNameDbQuery = `SELECT name FROM user WHERE user_id = ${follower_user_id};`;
      const getUserNameDb = await db.get(getUserNameDbQuery);
      response.send(getUserNameDb);
    }
  }
});

//API-6
app.get("/tweets/:tweetId/", authenticate, async (request, response) => {
  const { username } = request;
  const tweetId = request.params.tweetId;
  console.log(tweetId);
  const getUserDbQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const getUserDb = await db.get(getUserDbQuery);
  if (getUserDb !== undefined) {
    const { user_id } = getUserDb;
    const getFollowerDbQuery = `SELECT * FROM follower WHERE follower_id = ${user_id};`;
    const getFollowerDb = await db.get(getFollowerDbQuery);
    if (getFollowerDb !== undefined) {
      const { following_user_id } = getFollowerDb;
      const getUserIdByTweetIdQuery = `SELECT user_id FROM tweet WHERE tweet_id =${tweetId};`;
      const getUserIdByTweetId = await db.get(getUserIdByTweetIdQuery);
      if (getUserIdByTweetId.user_id === following_user_id) {
        const getDbQuery = `SELECT 
      tweet,COUNT(DISTINCT like.like_id) AS likes ,COUNT(DISTINCT reply.reply_id) AS replies,tweet.date_time AS dateTime
       FROM tweet INNER JOIN like INNER JOIN reply WHERE tweet.user_id= ${following_user_id} AND tweet.tweet_id = ${tweetId};`;
        const getDb = await db.all(getDbQuery);
        response.send(getDb);
      } else {
        response.status(401);
        response.send("Invalid Request");
      }
    }
  }
});

//API-7
app.get("/tweets/:tweetId/likes/", authenticate, async (request, response) => {
  const { username } = request;
  const tweetId = request.params.tweetId;
  console.log(tweetId);
  const getUserDbQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const getUserDb = await db.get(getUserDbQuery);
  if (getUserDb !== undefined) {
    const { user_id } = getUserDb;
    const getFollowerDbQuery = `SELECT * FROM follower WHERE follower_id = ${user_id};`;
    const getFollowerDb = await db.get(getFollowerDbQuery);
    if (getFollowerDb !== undefined) {
      const { following_user_id } = getFollowerDb;
      const getUserIdByTweetIdQuery = `SELECT user_id FROM tweet WHERE tweet_id =${tweetId};`;
      const getUserIdByTweetId = await db.get(getUserIdByTweetIdQuery);
      if (getUserIdByTweetId.user_id === following_user_id) {
        const getDbQuery = `SELECT DISTINCT user.username FROM like INNER JOIN user WHERE like.tweet_id = ${tweetId};`;
        const getDb = await db.all(getDbQuery);
        response.send(getDb);
      } else {
        response.status(401);
        response.send("Invalid Request");
      }
    }
  }
});
//API-8
app.get(
  "/tweets/:tweetId/replies/",
  authenticate,
  async (request, response) => {
    const { username } = request;
    const tweetId = request.params.tweetId;
    console.log(tweetId);
    const getUserDbQuery = `SELECT * FROM user WHERE username = "${username}";`;
    const getUserDb = await db.get(getUserDbQuery);
    if (getUserDb !== undefined) {
      const { user_id } = getUserDb;

      const getFollowerDbQuery = `SELECT * FROM follower WHERE follower_id = ${user_id};`;
      const getFollowerDb = await db.get(getFollowerDbQuery);
      if (getFollowerDb !== undefined) {
        const { following_user_id } = getFollowerDb;
        const getUserIdByTweetIdQuery = `SELECT user_id FROM tweet WHERE tweet_id =${tweetId};`;
        const getUserIdByTweetId = await db.get(getUserIdByTweetIdQuery);
        if (getUserIdByTweetId.user_id === following_user_id) {
          const getDbQuery = `SELECT reply.reply, user.username FROM reply INNER JOIN user WHERE reply.tweet_id = ${tweetId};`;
          const getDb = await db.all(getDbQuery);
          response.send(getDb);
        } else {
          response.status(401);
          response.send("Invalid Request");
        }
      }
    }
  }
);

//API-9
app.get("/user/tweets/", authenticate, async (request, response) => {
  const { username } = request;
  const getUserDbQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const getUserDb = await db.get(getUserDbQuery);
  console.log(getUserDb);
  if (getUserDb !== undefined) {
    const { user_id } = getUserDb;
    const getDbQuery = `SELECT
      tweet,COUNT(DISTINCT like.like_id) AS likes ,COUNT(DISTINCT reply.reply_id) AS replies,tweet.date_time AS dateTime
       FROM tweet INNER JOIN like INNER JOIN reply WHERE tweet.user_id= ${user_id};`;
    // const getDbQuery = `SELECT * FROM tweet WHERE user_id =${user_id};`;
    const getDb = await db.all(getDbQuery);
    response.send(getDb);
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

//API-10
app.post("/user/tweets/", authenticate, async (request, response) => {
  const { tweet } = request.body;
  console.log(tweet);
  const { username } = request;
  const getUserDbQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const getUserDb = await db.get(getUserDbQuery);
  console.log(getUserDb);
  if (getUserDb !== undefined) {
    const { user_id } = getUserDb;
    const postTweetQuery = `INSERT INTO tweet(tweet) VALUES("${tweet}");`;
    await db.run(postTweetQuery);
    response.send("Created Tweet");
  }
});

//API-11
app.delete("/tweets/:tweetId/", authenticate, async (request, response) => {
  const { username } = request;
  const getUserDbQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const getUserDb = await db.get(getUserDbQuery);
  console.log(getUserDb);
  if (getUserDb !== undefined) {
    const { user_id } = getUserDb;
    const deleteQuery = `DELETE * FROM tweet WHERE user_id = ${user_id};`;
    await db.run(deleteQuery);
    response.send("Tweet Removed");
  }
});
module.exports = app;
