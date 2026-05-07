import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from pathlib import Path
import threading

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "llm_model"

_MODEL = None
_TOKENIZER = None
_MODEL_AVAILABLE = False
_LOAD_ATTEMPTED = False
_LOAD_LOCK = threading.Lock()
_LOAD_EVENT = threading.Event()  # сигнализирует об окончании загрузки (успех или провал)


def load_model():
    global _MODEL, _TOKENIZER, _MODEL_AVAILABLE, _LOAD_ATTEMPTED

    # Быстрый путь без блокировки
    if _MODEL_AVAILABLE:
        return _MODEL, _TOKENIZER
    if _LOAD_ATTEMPTED and not _MODEL_AVAILABLE:
        return None, None

    with _LOAD_LOCK:
        # Повторная проверка внутри блокировки
        if _MODEL_AVAILABLE:
            return _MODEL, _TOKENIZER
        if _LOAD_ATTEMPTED:
            return None, None

        _LOAD_ATTEMPTED = True
        try:
            print(f"Loading model from {MODEL_PATH}...")

            if not MODEL_PATH.exists():
                raise FileNotFoundError(f"Папка модели не найдена: {MODEL_PATH}")

            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Using device: {device}")

            _TOKENIZER = AutoTokenizer.from_pretrained(
                MODEL_PATH, trust_remote_code=True, local_files_only=True
            )
            if _TOKENIZER.pad_token is None:
                _TOKENIZER.pad_token = _TOKENIZER.eos_token

            load_kwargs = dict(
                trust_remote_code=True,
                local_files_only=True,
            )
            if device == "cuda":
                load_kwargs.update(device_map="auto", torch_dtype=torch.float16)
            else:
                load_kwargs["device_map"] = "cpu"

            _MODEL = AutoModelForCausalLM.from_pretrained(MODEL_PATH, **load_kwargs)
            _MODEL.eval()
            _MODEL_AVAILABLE = True
            print("✅ Model loaded successfully.")

        except Exception as e:
            print(f"❌ Failed to load LLM model: {e}")
            _MODEL_AVAILABLE = False
            _MODEL = None
            _TOKENIZER = None

        finally:
            _LOAD_EVENT.set()  # разблокируем всех ожидающих, даже если была ошибка

    return _MODEL, _TOKENIZER


def wait_for_model(timeout: float = 120.0) -> bool:
    """Блокирует вызывающий поток до завершения загрузки модели.
    Возвращает True если модель успешно загружена, False — иначе."""
    _LOAD_EVENT.wait(timeout=timeout)
    return _MODEL_AVAILABLE


def is_model_available() -> bool:
    return _MODEL_AVAILABLE


def generate_text(prompt, max_length=400, temperature=0.15, top_p=0.85):
    model, tokenizer = load_model()
    if model is None:
        return None

    messages = [
        {"role": "system", "content": "Ты — эксперт по оценке компетенций. Отвечай кратко и по делу."},
        {"role": "user", "content": prompt}
    ]
    text = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs = tokenizer(
        text, return_tensors="pt", truncation=True, max_length=1024
    ).to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_length,
            do_sample=True,
            temperature=temperature,
            top_p=top_p,
            repetition_penalty=1.05,
            pad_token_id=tokenizer.eos_token_id,
        )

    generated = tokenizer.decode(outputs[0], skip_special_tokens=True)
    response = generated.split("<|im_start|>assistant\n")[-1].strip()
    return response