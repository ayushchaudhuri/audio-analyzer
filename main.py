from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import librosa
import numpy as np
from mutagen import File
import soundfile as sf
from pathlib import Path
import tempfile
import os
import mimetypes
from pydantic import BaseModel
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Get environment variables
PORT = int(os.getenv("PORT", 8000))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Configure CORS based on environment
if ENVIRONMENT == "production":
    # In production, configure with your actual frontend domain
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
else:
    # In development, allow localhost ports
    CORS_ORIGINS = [
        "http://localhost:5173",  # Vite dev
        "http://localhost:4173",  # Vite preview
        "http://localhost:3000",  # Alternative port
    ]

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisResult(BaseModel):
    bpm: float
    key: str
    keyConfidence: float
    loudness: float
    duration: float
    duration_formatted: str
    artist: str | None = None
    title: str | None = None

def get_audio_metadata(file_path: str) -> tuple[str | None, str | None]:
    """Extract artist and title from audio file metadata."""
    audio = File(file_path)
    if audio is None:
        return None, None
    
    if hasattr(audio, 'tags'):
        if hasattr(audio.tags, 'get'):
            artist = audio.tags.get('artist', [None])[0]
            title = audio.tags.get('title', [None])[0]
        else:
            artist = getattr(audio.tags, 'artist', [None])[0] if hasattr(audio.tags, 'artist') else None
            title = getattr(audio.tags, 'title', [None])[0] if hasattr(audio.tags, 'title') else None
        return artist, title
    return None, None

def get_duration(y: np.ndarray, sr: int) -> float:
    """Calculate duration from audio data and sample rate."""
    try:
        if y is None or sr <= 0:
            return 0.0
        
        # Get number of samples
        n_samples = y.shape[0]
        
        # Calculate duration in seconds
        duration = n_samples / sr
        
        # Validate the result
        if duration is None or np.isnan(duration) or duration < 0:
            return 0.0
            
        return float(duration)
    except Exception as e:
        logger.error(f"Error calculating duration: {str(e)}")
        return 0.0

def format_duration(seconds: float) -> str:
    """Format duration in seconds to mm:ss format."""
    try:
        # Convert to float and validate
        seconds = float(seconds)
        if np.isnan(seconds) or seconds < 0:
            return "00:00"
            
        # Round to nearest second and convert to int
        total_seconds = int(round(seconds))
        minutes = total_seconds // 60
        remaining_seconds = total_seconds % 60
        return f"{minutes:02d}:{remaining_seconds:02d}"
    except Exception as e:
        logger.error(f"Error formatting duration: {str(e)}")
        return "00:00"

def estimate_key(y, sr):
    """Estimate musical key using librosa with improved confidence calculation."""
    try:
        # Compute chromagram with better frequency resolution
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr, bins_per_octave=36)
        
        # Key detection using template matching
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        # Enhanced templates with more detailed harmonic relationships
        major_template = np.array([
            1.0,  # Root
            0.0,  # Minor second
            0.3,  # Major second
            0.0,  # Minor third
            0.6,  # Major third
            0.4,  # Perfect fourth
            0.0,  # Tritone
            0.8,  # Perfect fifth
            0.0,  # Minor sixth
            0.4,  # Major sixth
            0.0,  # Minor seventh
            0.2   # Major seventh
        ])
        
        minor_template = np.array([
            1.0,  # Root
            0.0,  # Minor second
            0.3,  # Major second
            0.6,  # Minor third
            0.0,  # Major third
            0.4,  # Perfect fourth
            0.0,  # Tritone
            0.8,  # Perfect fifth
            0.4,  # Minor sixth
            0.0,  # Major sixth
            0.4,  # Minor seventh
            0.0   # Major seventh
        ])
        
        # Compute correlation with templates
        chroma_avg = np.mean(chroma, axis=1)
        
        # Normalize the chromagram
        chroma_norm = librosa.util.normalize(chroma_avg)
        
        # Initialize correlations
        major_corr = np.zeros(12)
        minor_corr = np.zeros(12)
        
        # Calculate correlations
        for i in range(12):
            major_roll = np.roll(major_template, i)
            minor_roll = np.roll(minor_template, i)
            major_corr[i] = np.correlate(chroma_norm, major_roll)[0]
            minor_corr[i] = np.correlate(chroma_norm, minor_roll)[0]
        
        # Find best matches
        major_max_idx = np.argmax(major_corr)
        minor_max_idx = np.argmax(minor_corr)
        major_max_val = major_corr[major_max_idx]
        minor_max_val = minor_corr[minor_max_idx]
        
        # Calculate secondary peaks for confidence estimation
        major_corr[major_max_idx] = -np.inf
        minor_corr[minor_max_idx] = -np.inf
        second_major_val = np.max(major_corr)
        second_minor_val = np.max(minor_corr)
        
        # Determine key and calculate confidence
        if major_max_val >= minor_max_val:
            key = key_names[major_max_idx]
            # Calculate confidence based on:
            # 1. The absolute correlation value (how well it matches the template)
            # 2. The difference between the best and second-best match
            # 3. The difference between major and minor correlations
            abs_conf = (major_max_val + 1) / 2  # Scale from [-1,1] to [0,1]
            rel_conf = (major_max_val - second_major_val) / (major_max_val + 1e-6)
            mode_conf = (major_max_val - minor_max_val) / (max(major_max_val, minor_max_val) + 1e-6)
            confidence = (abs_conf * 0.4 + rel_conf * 0.4 + mode_conf * 0.2) * 100
        else:
            key = f"{key_names[minor_max_idx]}m"
            abs_conf = (minor_max_val + 1) / 2
            rel_conf = (minor_max_val - second_minor_val) / (minor_max_val + 1e-6)
            mode_conf = (minor_max_val - major_max_val) / (max(minor_max_val, major_max_val) + 1e-6)
            confidence = (abs_conf * 0.4 + rel_conf * 0.4 + mode_conf * 0.2) * 100
        
        # Add more detailed logging
        logger.debug(f"Key detection details:")
        logger.debug(f"Best major correlation: {major_max_val:.3f} (key: {key_names[major_max_idx]})")
        logger.debug(f"Best minor correlation: {minor_max_val:.3f} (key: {key_names[minor_max_idx]}m)")
        logger.debug(f"Absolute confidence: {abs_conf * 100:.1f}%")
        logger.debug(f"Relative confidence: {rel_conf * 100:.1f}%")
        logger.debug(f"Mode confidence: {mode_conf * 100:.1f}%")
        
        # Ensure confidence is a valid float between 0 and 100
        confidence = float(min(max(confidence, 0.0), 100.0))
        
        return key, confidence
    except Exception as e:
        logger.error(f"Key estimation error: {str(e)}")
        return "Unknown", 0.0

def calculate_lufs(y, sr):
    """
    Calculate LUFS (Loudness Unit Full Scale) using a simplified but accurate approach.
    """
    try:
        # Input validation and normalization
        if len(y) == 0:
            logger.error("Empty audio signal")
            return -70.0
            
        # Log input signal statistics
        logger.debug(f"Input signal stats - min: {np.min(y):.3f}, max: {np.max(y):.3f}, rms: {np.sqrt(np.mean(y**2)):.3f}")
        
        # Simple but effective loudness calculation
        # 1. Calculate RMS in 400ms blocks
        block_length = int(0.4 * sr)
        hop_length = block_length // 2  # 50% overlap
        
        # Ensure we have enough samples
        if len(y) < block_length:
            logger.warning("Audio file too short for accurate LUFS measurement")
            # For very short files, use the whole file
            rms = np.sqrt(np.mean(y**2))
            loudness = 20 * np.log10(rms + 1e-8)
            # Convert to LUFS scale (approximately)
            return float(max(min(loudness - 10, 0.0), -70.0))
        
        # Frame the signal into blocks
        blocks = librosa.util.frame(y, frame_length=block_length, hop_length=hop_length)
        logger.debug(f"Analysis blocks: {blocks.shape[1]}, samples per block: {blocks.shape[0]}")
        
        # Calculate RMS for each block
        block_rms = np.sqrt(np.mean(blocks**2, axis=0))
        logger.debug(f"Block RMS stats - min: {np.min(block_rms):.6f}, max: {np.max(block_rms):.6f}")
        
        # Convert to dB
        block_db = 20 * np.log10(block_rms + 1e-8)
        logger.debug(f"Block dB stats - min: {np.min(block_db):.1f}, max: {np.max(block_db):.1f}")
        
        # Remove silence and very quiet blocks (gating at -70 dB)
        valid_blocks = block_db > -70
        if not np.any(valid_blocks):
            logger.warning("No blocks above silence threshold")
            return -70.0
            
        valid_db = block_db[valid_blocks]
        logger.debug(f"Valid blocks: {np.sum(valid_blocks)} of {len(block_db)}")
        
        # Calculate the relative threshold
        mean_loudness = np.mean(valid_db)
        relative_threshold = mean_loudness - 10
        logger.debug(f"Mean loudness: {mean_loudness:.1f}, Relative threshold: {relative_threshold:.1f}")
        
        # Apply relative threshold gating
        final_blocks = block_db > relative_threshold
        if not np.any(final_blocks):
            logger.warning("No blocks above relative threshold")
            return -70.0
            
        # Calculate final LUFS value
        # Adjusted conversion factor to match industry standards
        lufs = float(np.mean(block_db[final_blocks]) - 10)  # Changed from -23 to -10
        
        # Ensure result is in valid range
        lufs = float(max(min(lufs, 0.0), -70.0))
        
        logger.debug(f"Final LUFS value: {lufs:.1f}")
        return lufs
        
    except Exception as e:
        logger.error(f"Error calculating LUFS: {str(e)}")
        return -70.0

@app.post("/analyze")
async def analyze_audio(file: UploadFile) -> AnalysisResult:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    logger.debug(f"Received file: {file.filename}")
    
    # Check file type
    mime_type, _ = mimetypes.guess_type(file.filename)
    if not mime_type or not mime_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    logger.debug(f"MIME type: {mime_type}")
    temp_path = None
    
    try:
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
            logger.debug(f"Temporary file created at: {temp_path}")

        try:
            # Load the audio file without resampling or normalization
            logger.debug("Loading audio file with librosa...")
            y, sr = librosa.load(temp_path, sr=None, mono=True)
            if len(y) == 0:
                raise ValueError("Empty audio file")
            logger.debug(f"Audio loaded successfully. Sample rate: {sr}, Duration: {len(y)/sr:.2f}s")
            logger.debug(f"Audio stats - Length: {len(y)}, Min: {np.min(y):.3f}, Max: {np.max(y):.3f}, RMS: {np.sqrt(np.mean(y**2)):.3f}")
            
            # Calculate duration from audio data
            duration = float(len(y)) / float(sr) if sr > 0 else 0.0
            if np.isnan(duration) or duration < 0:
                duration = 0.0
            logger.debug(f"Raw duration: {duration:.2f} seconds")
            
            # Extract features
            logger.debug("Extracting tempo...")
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            if np.isnan(tempo):
                tempo = 120.0
            logger.debug(f"Tempo extracted: {tempo}")
            
            logger.debug("Estimating key...")
            key, key_confidence = estimate_key(y, sr)
            logger.debug(f"Key estimated: {key} with confidence: {key_confidence}")
            
            # Calculate loudness (LUFS)
            logger.debug("Calculating loudness...")
            loudness_lufs = calculate_lufs(y, sr)
            logger.debug(f"Loudness: {loudness_lufs} LUFS")
            
            # Get metadata
            logger.debug("Extracting metadata...")
            artist, title = get_audio_metadata(temp_path)
            logger.debug(f"Metadata - Artist: {artist}, Title: {title}")
            
            return AnalysisResult(
                bpm=round(float(tempo), 1),
                key=key,
                keyConfidence=round(float(key_confidence), 1),
                loudness=round(float(loudness_lufs), 1),
                duration=duration,
                duration_formatted=format_duration(duration),
                artist=artist,
                title=title
            )
        
        except Exception as e:
            logger.error(f"Error during audio analysis: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error analyzing audio: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error handling file upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error handling file upload: {str(e)}")
    
    finally:
        # Clean up temporary file
        try:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
                logger.debug("Temporary file cleaned up")
        except Exception as e:
            logger.error(f"Error cleaning up temporary file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT) 