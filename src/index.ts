import express, { Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
const port = 3000;

// Mimic an S3 bucket structure
const s3Bucket = path.join(__dirname, "../s3-bucket");

// Create the "S3 bucket" directory if it doesn't exist
if (!fs.existsSync(s3Bucket)) {
  fs.mkdirSync(s3Bucket);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store files in a directory structure similar to S3 (e.g., bucket/folder/file)
    const [vedioId, dialogueId] = file.originalname.split("-");
    const folderPath = path.join(s3Bucket, vedioId, dialogueId);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const [_, __, fileName] = file.originalname.split("-");
    cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

// Define a custom type for the request with dynamic parameters
interface AudioRequest extends Request {
  params: {
    [key: string]: string;
    "0": string;
  };
}

// API to upload an audio file (mimicking S3 upload)
app.post("/upload", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const s3Path = `${req.body.folder || ""}/${req.file.filename}`;
  res.status(200).json({ message: "File uploaded successfully", s3Path });
});

// API to fetch an audio file by S3-like path
app.get("/audio/*", (req: AudioRequest, res) => {
  const filePath = path.join(s3Bucket, req.params["0"]);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

// API to list all audio files in a specific folder
app.get("/list-audios/*", (req: AudioRequest, res) => {
  const folderPath = path.join(s3Bucket, req.params["0"]);

  if (fs.existsSync(folderPath) && fs.lstatSync(folderPath).isDirectory()) {
    const files = fs
      .readdirSync(folderPath)
      .filter((file) => [".mp3", ".wav", ".ogg"].includes(path.extname(file).toLowerCase()));
    res.status(200).json({ files });
  } else {
    res.status(200).json({ files: [] });
  }
});

//api for changing the name of the audio file
app.post("/change-audio-name", (req, res) => {
  const { oldName, newName } = req.body;
  const oldPath = path.join(s3Bucket, oldName);
  const newPath = path.join(s3Bucket, newName);
  fs.renameSync(oldPath, newPath);
  res.status(200).json({ message: "Audio file name changed successfully" });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
