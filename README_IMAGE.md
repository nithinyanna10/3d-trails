# Image Processing Setup

## Backend Requirements

To enable image OCR (Optical Character Recognition), you need to install Tesseract OCR:

### macOS
```bash
brew install tesseract
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

### Windows
Download and install from: https://github.com/UB-Mannheim/tesseract/wiki

## Python Dependencies

The backend requires:
- `pillow>=10.0.0` - For image processing
- `pytesseract>=0.3.10` - Python wrapper for Tesseract OCR

These are already in `requirements.txt`. Install with:
```bash
cd backend
pip install -r requirements.txt
```

## Usage

1. Start the backend server
2. In the Studio page, select "Image" input mode
3. Click "Upload Image" and select an image file
4. The extracted text will appear in the textarea and automatically create a trail

## Supported Image Formats

- JPEG/JPG
- PNG
- GIF
- BMP
- TIFF


