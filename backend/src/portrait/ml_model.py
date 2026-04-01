import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

_MODEL = None
_TOKENIZER = None

def load_model():
    global _MODEL, _TOKENIZER
    if _MODEL is None:
        model_name = "Qwen/Qwen2.5-1.5B-Instruct"
        print(f"Loading {model_name}...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {device}")

        _TOKENIZER = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        if _TOKENIZER.pad_token is None:
            _TOKENIZER.pad_token = _TOKENIZER.eos_token

        # 4-битная квантизация
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )
        _MODEL = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.float16,
        )
        _MODEL.eval()
        print("Model loaded.")
    return _MODEL, _TOKENIZER

def generate_text(prompt, max_length=200, temperature=0.7, top_p=0.9):
    model, tokenizer = load_model()
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
    # Явно перемещаем на устройство модели
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