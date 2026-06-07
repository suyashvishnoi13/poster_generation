import os
import io
import random
import base64
import re
import time
import traceback
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from huggingface_hub import InferenceClient
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from dotenv import load_dotenv
import torch
from transformers import BlipProcessor, BlipForConditionalGeneration

load_dotenv()
app = Flask(__name__)
CORS(app)

HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    print("WARNING: No HF_TOKEN found in environment.")


FONT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "font.ttf")

text_client  = InferenceClient(model="Qwen/Qwen2.5-72B-Instruct", token=HF_TOKEN)
image_client = InferenceClient(model="black-forest-labs/FLUX.1-schnell", token=HF_TOKEN)

device = "cuda" if torch.cuda.is_available() else "cpu"

blip_processor = None
blip_model = None

def load_blip():
    global blip_processor, blip_model

    if blip_processor is None or blip_model is None:
        print(f"Loading BLIP on {device}...")

        blip_processor = BlipProcessor.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )

        blip_model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        ).to(device)

        print("BLIP loaded successfully.")


# ── HELPERS ──────────────────────────────────────────────────
from PIL import Image

def add_logo_to_poster(poster_path, logo_path, output_path):
    poster = Image.open(poster_path).convert("RGBA")
    logo = Image.open(logo_path).convert("RGBA")

    # Auto resize logo
    max_width = poster.width // 5
    ratio = max_width / logo.width
    new_size = (int(logo.width * ratio), int(logo.height * ratio))
    logo = logo.resize(new_size)

    # Bottom-right placement
    position = (
        poster.width - logo.width - 20,
        poster.height - logo.height - 20
    )

    poster.paste(logo, position, logo)
    poster.convert("RGB").save(output_path)


def clean_text(text):
    text = re.sub(r"\[.*?\]", "", text)
    text = re.sub(r"<.*?>",   "", text)
    text = text.replace('"', '').replace("'", "").strip()
    for prefix in ["Slogan:", "Here is a slogan:", "Answer:"]:
        if prefix in text:
            text = text.split(prefix)[-1].strip()
    return text


def load_fonts(title_size=90, slogan_size=55, small_size=38):
    try:
        tf = ImageFont.truetype(FONT_PATH, title_size)
        sf = ImageFont.truetype(FONT_PATH, slogan_size)
        mf = ImageFont.truetype(FONT_PATH, small_size)
        print(f"Font OK: {FONT_PATH}")
    except Exception as e:
        print(f"Font FAILED ({e}) — using default")
        tf = sf = mf = ImageFont.load_default()
    return tf, sf, mf


def enhance_image_prompt(business, desc, tone):
    base = (
        f"Professional product advertisement photo. "
        f"Subject: {desc}. Clean studio lighting, sharp focus on product, "
        f"commercial photography style. Do not include any text, words, or watermarks in the image."
    )
    if "Catchy"       in tone: base += " Vibrant saturated colors, bold composition."
    elif "Professional" in tone: base += " Minimalist white background, sleek modern aesthetic."
    elif "Luxury"     in tone: base += " Dark background, dramatic lighting, gold accents, premium feel."
    elif "Humorous"   in tone: base += " Bright cheerful colors, playful fun composition."
    return base


def wrap_text_pixels(draw, text, font, max_width):
    """Wrap by actual pixel width, not character count."""
    words   = text.split()
    lines   = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        w    = draw.textbbox((0, 0), test, font=font)[2]
        if w <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_slogan_bottom(draw, lines, font, canvas_w, canvas_h):
    """Anchor slogan block 60 px above the bottom edge."""
    line_h  = font.size + 14
    block_h = len(lines) * line_h
    y       = canvas_h - block_h - 60

    for line in lines:
        lw = draw.textbbox((0, 0), line, font=font)[2]
        x  = (canvas_w - lw) / 2
        draw.text((x + 2, y + 2), line, font=font, fill=(0, 0, 0, 180))
        draw.text((x,     y    ), line, font=font, fill="white")
        y += line_h


# ── LAYOUT ENGINE ────────────────────────────────────────────

def create_social_layout(img, business, slogan, format_type, logo_img=None, logo_position="top_right"):
    """
    BUG FIX 3: Story format was cropping the source image to landscape
    instead of compositing it properly onto a 9:16 canvas.
    Now we always start from a fresh canvas of the correct dimensions
    and SCALE the source image to fit — never crop it arbitrarily.
    """
    title_font, slogan_font, small_font = load_fonts()

    def apply_logo(canvas_img):
        if not logo_img:
            return
        logo = logo_img.copy()
        max_width = int((canvas_img.width // 5) * 0.6)
        ratio = max_width / logo.width
        new_size = (int(logo.width * ratio), int(logo.height * ratio))
        logo = logo.resize(new_size)

        if logo_position == "top_right":
            position = (canvas_img.width - logo.width - 30, 30)
        elif logo_position == "top_left":
            position = (30, 30)
        elif logo_position == "bottom_right":
            position = (canvas_img.width - logo.width - 30, canvas_img.height - logo.height - 30)
        elif logo_position == "bottom_center":
            position = ((canvas_img.width - logo.width) // 2, canvas_img.height - logo.height - 30)
        else:
            position = (30, 30)

        shadow = Image.new("RGBA", logo.size, (0, 0, 0, 120))
        shadow_pos = (position[0] + 5, position[1] + 5)
        canvas_img.paste(shadow, shadow_pos, shadow)
        canvas_img.paste(logo, position, logo)

    # ── SQUARE 1:1 ──────────────────────────────────────────
    if format_type != "Story":
        # BUG FIX 1: Always work on a fresh 1024×1024 copy of the source image
        # so repeated calls never shrink the canvas.
        TARGET = 1024
        canvas = img.convert("RGBA").resize((TARGET, TARGET), Image.LANCZOS)
        w, h   = canvas.size

        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        d.rectangle([(0, h - 220), (w, h)],  fill=(0, 0, 0, 210))
        d.rectangle([(0, 0),       (w, 160)], fill=(0, 0, 0, 180))
        canvas = Image.alpha_composite(canvas, overlay)
        
        apply_logo(canvas)
        
        draw   = ImageDraw.Draw(canvas)

        # Title
        title_text = business.upper()
        tw = draw.textbbox((0, 0), title_text, font=title_font)[2]
        tx = max(10, (w - tw) / 2)
        draw.text((tx + 2, 32), title_text, font=title_font, fill=(0, 0, 0, 160))
        draw.text((tx,     30), title_text, font=title_font, fill="#FFD700")

        # Slogan
        lines = wrap_text_pixels(draw, slogan, slogan_font, w - 60)
        draw_slogan_bottom(draw, lines, slogan_font, w, h)

        return canvas

    # ── STORY 9:16 ───────────────────────────────────────────
    else:
        WIDTH, HEIGHT = 1080, 1920
        canvas = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))

        # Blurred full-bleed background — scale source to fill canvas
        bg = img.convert("RGB")
        bg_ratio     = WIDTH / HEIGHT
        src_ratio    = bg.width / bg.height
        if src_ratio > bg_ratio:
            # source is wider — fit height, crop width
            new_h = HEIGHT + 200
            new_w = int(new_h * src_ratio)
        else:
            # source is taller — fit width, crop height
            new_w = WIDTH + 200
            new_h = int(new_w / src_ratio)
        bg = bg.resize((new_w, new_h), Image.LANCZOS)
        bg = bg.filter(ImageFilter.GaussianBlur(radius=28))
        # Centre-crop to canvas size
        left = (new_w - WIDTH)  // 2
        top  = (new_h - HEIGHT) // 2
        bg   = bg.crop((left, top, left + WIDTH, top + HEIGHT))
        canvas.paste(bg, (0, 0))

        # Dark overlay
        overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 140))
        canvas.paste(
            Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0)),
            (0, 0),
            overlay
        )

        # BUG FIX 3: Product image — scale to fit inside a square region,
        # preserving aspect ratio. Never distort.
        PRODUCT_SIZE = 860
        product      = img.convert("RGB")
        product.thumbnail((PRODUCT_SIZE, PRODUCT_SIZE), Image.LANCZOS)
        pw, ph = product.size
        px     = (WIDTH  - pw) // 2
        py     = (HEIGHT - ph) // 2 - 80   # slightly above centre

        # White border frame
        border_pad = 10
        border     = Image.new("RGB", (pw + border_pad*2, ph + border_pad*2), (255, 255, 255))
        canvas.paste(border,  (px - border_pad, py - border_pad))
        canvas.paste(product, (px, py))

        canvas = canvas.convert("RGBA")
        apply_logo(canvas)

        draw = ImageDraw.Draw(canvas)

        # Title
        title_text = business.upper()
        tw = draw.textbbox((0, 0), title_text, font=title_font)[2]
        tx = max(20, (WIDTH - tw) / 2)
        draw.text((tx + 2, 122), title_text, font=title_font, fill=(0, 0, 0, 160))
        draw.text((tx,     120), title_text, font=title_font, fill="#FFD700")

        # Slogan
        lines = wrap_text_pixels(draw, slogan, slogan_font, WIDTH - 80)
        draw_slogan_bottom(draw, lines, slogan_font, WIDTH, HEIGHT - 60)

        # Dynamic Call-To-Action hint
        cta_options = ["SHOP NOW", "EXPLORE", "BUY NOW", "SWIPE UP", ""]
        cta = random.choice(cta_options)
        if cta:
            hint = f"^ {cta} ^"
            hw   = draw.textbbox((0, 0), hint, font=small_font)[2]
            draw.text(((WIDTH - hw) / 2, HEIGHT - 55), hint, font=small_font, fill="#888888")

        return canvas


# ── ROUTES ───────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "active", "message": "Desi-Scribe Backend is Live!"})


@app.route("/analyze-image", methods=["POST"])
def analyze_image():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        image = Image.open(file.stream).convert("RGB")
        image.thumbnail((512, 512))

        try:
            # Load BLIP only when needed
            load_blip()

            inputs = blip_processor(
                image,
                return_tensors="pt"
            ).to(device)

            out = blip_model.generate(
                **inputs,
                max_new_tokens=50
            )

            caption = blip_processor.decode(
                out[0],
                skip_special_tokens=True
            ).strip()

            if caption:
                caption = caption[0].upper() + caption[1:]

            prompt = (
                f"I have a product with this description: '{caption}'. "
                "Suggest a short Business Name (max 3 words) and a Tone "
                "(choose from: Catchy, Professional, Luxury, Humorous) "
                "that would fit an advertisement for it. "
                "Format EXACTLY like this: Business Name | Tone"
            )

            res = text_client.chat_completion(
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=30
            )

            res_text = (
                res.choices[0]
                .message.content
                .strip()
                .replace("\n", "")
            )

            parts = res_text.split("|")

            if len(parts) >= 2:
                name = parts[0].strip()
                tone = parts[1].strip()
            else:
                name = "My Business"
                tone = "Professional"

        except Exception as e:
            print(f"BLIP/Qwen failed: {e}")

            caption = "A product image"
            name = "My Business"
            tone = "Professional"

        return jsonify({
            "status": "success",
            "description": caption,
            "business_type": name,
            "tone": tone
        })

    except Exception as e:
        traceback.print_exc()

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route("/generate-slogan", methods=["POST"])
def generate_slogan():
    try:
        data   = request.get_json()
        lang   = data.get("language", "English")
        b_type = data.get("business_type", "business")
        desc   = data.get("product_description", "")
        tone   = data.get("ad_type", "Catchy")

        res    = text_client.chat_completion(
            messages=[{"role": "user", "content":
                f"Write one short {tone} advertising slogan for a {b_type} that sells {desc}. "
                f"Language: {lang}. Output ONLY the slogan. No quotes. No explanation."}],
            max_tokens=60
        )
        return jsonify({"status": "success", "slogan": clean_text(res.choices[0].message.content)})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/generate-poster", methods=["POST"])
def generate_poster():
    try:
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form

        b_type = data.get("business_type", "Business")
        desc   = data.get("product_description", "product")
        tone   = data.get("ad_type", "Catchy")
        lang   = data.get("language", "English")
        fmt    = data.get("format", "Square")
        use_img = str(data.get("use_uploaded_image", "false")).lower() == "true"

        # 🔥 Get logo + position
        logo_file = request.files.get("logo")
        logo_position = request.form.get("logo_position", "top_right")

        if logo_file and logo_file.filename.strip() == "":
            logo_file = None

        # ─────────────────────────────
        # 🧠 Generate slogan
        # ─────────────────────────────
        slogan_res = text_client.chat_completion(
            messages=[{
                "role": "user",
                "content": f"Write one short {tone} advertising slogan for a {b_type} that sells {desc}. Language: {lang}. Max 8 words. Output ONLY the slogan. No quotes."
            }],
            max_tokens=40
        )
        slogan = clean_text(slogan_res.choices[0].message.content)

        # ─────────────────────────────
        # 🎨 Generate / use image
        # ─────────────────────────────
        if use_img and "image" in request.files:
            file = request.files["image"]
            img = Image.open(file.stream).convert("RGB")
        else:
            img_prompt = enhance_image_prompt(b_type, desc, tone)
            img = image_client.text_to_image(img_prompt)

        # ─────────────────────────────
        # 🏢 Prepare logo
        # ─────────────────────────────
        logo_applied = False
        logo_img = None
        if logo_file:
            logo_img = Image.open(logo_file.stream).convert("RGBA")
            logo_applied = True

        # ─────────────────────────────
        # 🖼 Layout
        # ─────────────────────────────
        final = create_social_layout(img, b_type, slogan, fmt, logo_img, logo_position)

        # ─────────────────────────────
        # 📦 Convert to base64
        # ─────────────────────────────
        buf = io.BytesIO()
        final = final.convert("RGB")
        final.save(buf, format="JPEG", quality=88, optimize=True)
        buf.seek(0)

        img_b64 = base64.b64encode(buf.getvalue()).decode()

        return jsonify({
            "status": "success",
            "image_url": f"data:image/jpeg;base64,{img_b64}",
            "slogan": slogan,
            "logo_applied": logo_applied,
            "logo_position": logo_position
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)