# portrait/ml_model.py
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from pathlib import Path

MODEL_PATH = Path(r"G:\stud-portrait\backend\src\portrait\llm_model")

_MODEL = None
_TOKENIZER = None
_LOADED = False   # <-- добавить флаг

def load_model():
    global _MODEL, _TOKENIZER, _LOADED
    if _LOADED:
        return _MODEL, _TOKENIZER

    print(f"Loading model from {MODEL_PATH}...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    _TOKENIZER = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
    if _TOKENIZER.pad_token is None:
        _TOKENIZER.pad_token = _TOKENIZER.eos_token

    if device == "cuda":
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )
        _MODEL = AutoModelForCausalLM.from_pretrained(
            MODEL_PATH,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.float16,
        )
    else:
        _MODEL = AutoModelForCausalLM.from_pretrained(
            MODEL_PATH,
            device_map="cpu",
            trust_remote_code=True,
            torch_dtype=torch.float32,
        )
    _MODEL.eval()
    _LOADED = True
    print("Model loaded successfully.")
    return _MODEL, _TOKENIZER

def generate_text(prompt, max_length=200, temperature=0.7, top_p=0.9):
    model, tokenizer = load_model()
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
        )
    text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    if text.startswith(prompt):
        text = text[len(prompt):].strip()
    return text