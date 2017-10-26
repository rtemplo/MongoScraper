var db = require("../models");
var ObjectId = require("mongojs").ObjectId;

module.exports = function(app, axios, cheerio) {

    //
    app.get("/", function (req, res) {
        db.Article.find({}).then(function (dbArticles) {
            res.render("index", {numsaved:dbArticles.length});
        });
    });

    // A GET route for scraping the NYT Tech Section
    app.get("/scrape", function(req, res) {
        // Get the body of the targeted web page
        axios.get("https://www.nytimes.com/section/technology").then(function(response) {
            // load the body to a cheerio object for jQuery like DOM traversing and manipulation
            var $ = cheerio.load(response.data);
        
            // create an array of articles (array of objects representing articles) that need to be saved
            var scrapedArticlesArr = [];
            // Get every h2 tag inside an article tag - this will only get the main articles
            $("article h2").has("a").each(function(i, element) {
                var result = {};
        
                // Add the text and href of every link, and save them as properties of the result object
                result.title = $(this).children("a").text();
                result.link = $(this).children("a").attr("href");
                scrapedArticlesArr.push(result);
            });

            res.render("scraped", {scrapedArticles:scrapedArticlesArr});

            /*
            Leaving the commented out code below for future reference on how to bulk load data to Mongo via Mongoose
            */
            // Create a new the all the articles all at once with the articlesToSaveObj array
            // db.Article.create(articlesToSaveObj).then(function(dbArticle) {
            //     // Send the number of articles that were saved
            //     res.json({saved:dbArticle.length });
            // }).catch(function(err) {
            //     res.json(err);
            // });            

        });

    });

    // Get all articles in the db
    app.get("/articles", function(req, res) {
        db.Article.find({}).then(function(dbArticles) {
            var hbsObject = {articles:dbArticles}
            res.render("articles", hbsObject);
        }).catch(function(err) {
            res.json(err);
        });
    });

    app.post("/articles", function (req, res) {
        db.Article.findOneAndUpdate(
            { title:req.body.title }, 
            { $set:{ link:req.body.link } }, 
            { upsert:true, new:true },
            function (err, result) {
                res.json(result);
            }
        );
    });

    app.delete("/articles/:id", function(req, res) {    
        db.Article.remove({_id:ObjectId(req.params.id)}).then(function(result) {
            res.json(result);
        });
    });

    // Retrieve specific Article by id and populate it's note field, then send back the object representing the article to the client side
    app.get("/articles/:id", function(req, res) {
        // find the target article, populate it's note reference field, then return it to the client side
        db.Article.findOne({ _id: req.params.id }).populate("note").then(function(dbArticle) {
            res.json(dbArticle);
        }).catch(function(err) {
            res.json(err);
        });
    });
  
    // Route for saving a Note and associating it to an article
    app.post("/articles/:id", function(req, res) {
        db.Note.create(req.body).then(function(dbNote) {
            return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push:{ note: dbNote._id } }, { new: true });
        }).then(function(dbArticle) {
            res.json(dbArticle);
        }).catch(function(err) {
            res.json(err);
        });
    });
  
} //module exports