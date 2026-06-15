from pathlib import Path
import threading
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

DEVICE_AUTO = "auto"
DEVICE_CUDA = "cuda"
DEVICE_CPU = "cpu"

class MlModel:
    PATH = Path(__file__).resolve().parent.parent / "llm_model"
    MODEL = None
    TOKENIZER = None
    AVAILABLE = False               # model is accessible
    LOAD_ATTEMPTED = False          # there's already been an attempt to load a model
    LOAD_LOCK = threading.Lock()    # lock for loading attempt
    LOAD_EVENT = threading.Event()  # indicate the end of a loading attempt

    @classmethod
    def load(cls):
        """ Try load tokenizer and model.
        """
        with cls.LOAD_LOCK:
            try:
                print(f"[model] (i): loading model from folder {cls.PATH}")
                cls.LOAD_ATTEMPTED = True

                if not cls.PATH.exists():
                    raise FileNotFoundError(f"[model] (!): model folder does not exist: {cls.PATH}")

                device = DEVICE_CUDA if torch.cuda.is_available() else DEVICE_CPU
                print(f"[model] (i): using device {device}")

                tokenizer = AutoTokenizer.from_pretrained(cls.PATH, trust_remote_code=True, local_files_only=True)
                if tokenizer.pad_token is None:
                    tokenizer.pad_token = tokenizer.eos_token

                load_kwargs = {
                    "trust_remote_code": True,
                    "local_files_only":  True,
                }
                if device == DEVICE_CUDA:
                    load_kwargs["device_map"] = DEVICE_AUTO
                    load_kwargs["torch_dtype"] = torch.float16
                else:
                    load_kwargs["device_map"] = DEVICE_CPU

                model = AutoModelForCausalLM.from_pretrained(cls.PATH, **load_kwargs)
                model.eval()

                cls.TOKENIZER = tokenizer
                cls.MODEL = model
                cls.AVAILABLE = True
                print("[model] (i): model loaded successfully")

            except Exception as e:
                cls.TOKENIZER = None
                cls.MODEL = None
                cls.AVAILABLE = False
                print(f"[model] (!): failed to load LLM model: {e}")

            finally:
                cls.LOAD_EVENT.set()  # unlock all, even if failed
        return cls.AVAILABLE

    @classmethod
    def get(cls):
        """ Get model and tokenizer if available.
        """
        if cls.AVAILABLE or cls.LOAD_ATTEMPTED:
            return cls.MODEL, cls.TOKENIZER
        cls.load()
        return cls.MODEL, cls.TOKENIZER

    @classmethod
    def waitForLoad(cls, timeout=120.) -> bool:
        """ Wait for model to load. Get whether it was loaded.
        """
        cls.LOAD_EVENT.wait(timeout=timeout)
        return cls.AVAILABLE

    @classmethod
    def generate(cls, prompt: str, max_length=400, temperature=.15, top_p=.85):
        model, tokenizer = cls.get()
        if model is None:
            return None

        messages = [
            {"role": "system", "content": "Ты — эксперт по оценке компетенций. Отвечай кратко и по делу."},
            {"role": "user", "content": prompt}
        ]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=1024).to(model.device)

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
        response = generated                      \
            .split("<|im_start|>assistant\n")[-1] \
            .strip()                              \
            .rpartition("assistant")[-1]

        print(f"[model] (i): model got prompt: '{prompt}'")
        print(f"[model] (i): model generated response: '{response}'")

        return response
