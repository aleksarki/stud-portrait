import threading
from pathlib import Path

# === БЕЗОПАСНЫЙ ИМПОРТ ML-ЗАВИСИМОСТЕЙ ===
# Если torch/transformers не установлены, Django не упадёт при старте
try:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    AutoTokenizer = None
    AutoModelForCausalLM = None
    TORCH_AVAILABLE = False

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "llm_model"

_MODEL = None
_TOKENIZER = None
_MODEL_AVAILABLE = False
_LOAD_ATTEMPTED = False
_LOAD_LOCK = threading.Lock()


def load_model():
    global _MODEL, _TOKENIZER, _MODEL_AVAILABLE, _LOAD_ATTEMPTED

    # Если библиотека не установлена, сразу возвращаем None
    if not TORCH_AVAILABLE:
        return None, None
    if _MODEL_AVAILABLE:
        return _MODEL, _TOKENIZER
    if _LOAD_ATTEMPTED:
        return None, None

    with _LOAD_LOCK:
        if _MODEL_AVAILABLE:
            return _MODEL, _TOKENIZER
        if _LOAD_ATTEMPTED:
            return None, None

        _LOAD_ATTEMPTED = True
        try:
            print(f"Loading model from {MODEL_PATH}...")
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Using device: {device}")

            _TOKENIZER = AutoTokenizer.from_pretrained(
                MODEL_PATH, trust_remote_code=True, local_files_only=True
            )
            if _TOKENIZER.pad_token is None:
                _TOKENIZER.pad_token = _TOKENIZER.eos_token

            # Загрузка модели в зависимости от устройства
            if device == "cuda":
                _MODEL = AutoModelForCausalLM.from_pretrained(
                    MODEL_PATH,
                    device_map="auto",
                    trust_remote_code=True,
                    torch_dtype=torch.float16,
                    local_files_only=True,
                )
            else:
                _MODEL = AutoModelForCausalLM.from_pretrained(
                    MODEL_PATH,
                    device_map="cpu",
                    trust_remote_code=True,
                    local_files_only=True,
                )

            _MODEL.eval()
            _MODEL_AVAILABLE = True
            print("Model loaded successfully.")
        except Exception as e:
            print(f"Failed to load LLM model: {e}")
            _MODEL_AVAILABLE = False
            _MODEL = None
            _TOKENIZER = None

        return _MODEL, _TOKENIZER


def is_model_available():
    """Возвращает True только если библиотека установлена И модель загружена."""
    return TORCH_AVAILABLE and _MODEL_AVAILABLE


def generate_text(prompt, max_length=200, temperature=0.7, top_p=0.9):
    """Безопасная генерация текста. Не упадёт, если torch отсутствует."""
    if not TORCH_AVAILABLE:
        return "[ML OFF] Библиотека torch/transformers не установлена. Аналитический модуль работает независимо."

    model, tokenizer = load_model()
    if model is None:
        return None

    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_length,
            do_sample=True,
            temperature=temperature,
            top_p=top_p,
            repetition_penalty=1.2,
            pad_token_id=tokenizer.eos_token_id,
        )

    text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    if text.startswith(prompt):
        text = text[len(prompt):].strip()
    return text