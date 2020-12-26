var express = require("express");
var router = express.Router();
var path = require("path");
const { google } = require("googleapis");
const readline = require("readline");

/* GET users listing. */
router.get("/:videoId", async function (req, res, next) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, "../credentials.json"),
      scopes: "https://www.googleapis.com/auth/drive",
    });
    const drive = google.drive({ version: "v3", auth });

    let fileInfo = await drive.files.get({
      fileId: req.params.videoId,
      fields: "*",
    });

    let fileSize = fileInfo.data.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      //const end = parts[1] ? parseInt(parts[1], 10) : start + 10000000;
      const chunksize = end - start + 1;
      const file = await drive.files.get(
        {
          fileId: req.params.videoId,
          alt: "media",
        },
        { headers: { Range: `bytes=${start}-${end}` }, responseType: "stream" }
      );
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": fileInfo.data.mimeType,
      };
      res.writeHead(206, head);
      file.data
        .on("error", function (err) {
          console.log("Error during download", err);
        })
        .pipe(res);
      res.on("close", () => {
        file.data.unpipe(res);
        file.data.end();
      });
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": fileInfo.data.mimeType,
      };

      res.writeHead(200, head);

      const file = await drive.files.get(
        {
          fileId: req.params.videoId,
          alt: "media",
        },
        { responseType: "stream" }
      );
      file.data.pipe(res);
      res.on("close", () => {
        file.data.unpipe(res);
        file.data.end();
      });
    }
  } catch (error) {
    res.status(404).send()
  }
});

module.exports = router;
