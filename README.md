# Desi-Scribe

AI-powered advertisement and poster generation platform built with Flask, Hugging Face AI models, and a modern frontend.

## Features

* Product image analysis using BLIP Image Captioning
* Automatic business name suggestions
* AI-generated advertising slogans
* AI-generated marketing posters
* Multiple advertisement styles:

  * Catchy
  * Professional
  * Luxury
  * Humorous
* Logo upload and placement
* Social media ready formats:

  * Square (1:1)
  * Story (9:16)
* Multilingual slogan generation
* Custom product image support

---

## Tech Stack

### Backend

* Flask
* Flask-CORS
* Hugging Face Inference API
* Transformers
* PyTorch
* Pillow

### AI Models

* Qwen 2.5 72B Instruct (Text Generation)
* FLUX.1 Schnell (Image Generation)
* BLIP Image Captioning

### Frontend

* HTML
* CSS
* JavaScript

---

## Project Structure

```text
desi-scribe/
│
├── frontend/
│   ├── assets/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   ├── auth.js
│   └── firebase.js
│
├── app.py
├── font.ttf
├── requirements.txt
├── Procfile
├── .gitignore
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/your-username/desi-scribe.git
cd desi-scribe
```

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate Environment

Windows:

```bash
venv\Scripts\activate
```

Mac/Linux:

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Environment Variables

Create a `.env` file:

```env
HF_TOKEN=your_huggingface_token
GEMINI_API_KEY=your_gemini_api_key
```

Never commit your `.env` file to GitHub.

---

## Run Locally

```bash
python app.py
```

Backend runs on:

```text
http://localhost:5001
```

---

## API Endpoints

### Health Check

```http
GET /
```

Response:

```json
{
  "status": "active",
  "message": "Desi-Scribe Backend is Live!"
}
```

---

### Analyze Product Image

```http
POST /analyze-image
```

Uploads an image and returns:

* Product description
* Suggested business name
* Advertisement tone

---

### Generate Slogan

```http
POST /generate-slogan
```

Returns an AI-generated advertising slogan.

---

### Generate Poster

```http
POST /generate-poster
```

Returns a complete marketing poster with:

* Product image
* Business branding
* Slogan
* Optional logo placement

---

## Deployment on Render

### Build Command

```bash
pip install -r requirements.txt
```

### Start Command

```bash
gunicorn app:app
```

### Environment Variables

Add in Render Dashboard:

```env
HF_TOKEN=your_huggingface_token
GEMINI_API_KEY=your_gemini_api_key
```

---

## Screenshots

Add screenshots of your application here.

Example:

```markdown
![Home Page](screenshots/home.png)
![Poster Generator](screenshots/poster.png)
```

---

## Future Improvements

* User authentication
* Campaign management dashboard
* Additional poster templates
* Social media scheduling
* Advanced branding options
* More AI model integrations

---

## License

This project is developed for educational and demonstration purposes.

---

## Author

Suyash

Built with Flask, Hugging Face AI, BLIP, FLUX and Qwen.
