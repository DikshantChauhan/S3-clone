"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)());
const port = 3000;
// Mimic an S3 bucket structure
const s3Bucket = path_1.default.join(__dirname, "../s3-bucket");
// Create the "S3 bucket" directory if it doesn't exist
if (!fs_1.default.existsSync(s3Bucket)) {
    fs_1.default.mkdirSync(s3Bucket);
}
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Store files in a directory structure similar to S3 (e.g., bucket/folder/file)
        const [vedioId, dialogueId] = file.originalname.split("-");
        const folderPath = path_1.default.join(s3Bucket, vedioId, dialogueId);
        if (!fs_1.default.existsSync(folderPath)) {
            fs_1.default.mkdirSync(folderPath, { recursive: true });
        }
        cb(null, folderPath);
    },
    filename: (req, file, cb) => {
        const [_, __, fileName] = file.originalname.split("-");
        cb(null, fileName);
    },
});
const upload = (0, multer_1.default)({ storage: storage });
// API to upload an audio file (mimicking S3 upload)
app.post("/upload", upload.single("audio"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    const s3Path = `${req.body.folder || ""}/${req.file.filename}`;
    res.status(200).json({ message: "File uploaded successfully", s3Path });
});
// API to fetch an audio file by S3-like path
app.get("/audio/*", (req, res) => {
    const filePath = path_1.default.join(s3Bucket, req.params["0"]);
    if (fs_1.default.existsSync(filePath)) {
        res.sendFile(filePath);
    }
    else {
        res.status(404).json({ message: "File not found" });
    }
});
// API to list all audio files in a specific folder
app.get("/list-audios/*", (req, res) => {
    const folderPath = path_1.default.join(s3Bucket, req.params["0"]);
    if (fs_1.default.existsSync(folderPath) && fs_1.default.lstatSync(folderPath).isDirectory()) {
        const files = fs_1.default
            .readdirSync(folderPath)
            .filter((file) => [".mp3", ".wav", ".ogg"].includes(path_1.default.extname(file).toLowerCase()));
        res.status(200).json({ files });
    }
    else {
        res.status(200).json({ files: [] });
    }
});
//api for changing the name of the audio file
app.post("/change-audio-name", (req, res) => {
    const { oldName, newName } = req.body;
    const oldPath = path_1.default.join(s3Bucket, oldName);
    const newPath = path_1.default.join(s3Bucket, newName);
    fs_1.default.renameSync(oldPath, newPath);
    res.status(200).json({ message: "Audio file name changed successfully" });
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
