from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from pathlib import Path
import logging
from contextlib import asynccontextmanager
import asyncio
from enum import Enum


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Конфигурация
MODEL_PATH = Path("/app/models/qwen")  # путь внутри контейнера
DEVICE_CUDA = "cuda"
DEVICE_CPU = "cpu"


class DeviceType(str, Enum):
    auto = "auto"
    cuda = "cuda"
    cpu = "cpu"


class GenerationRequest(BaseModel):
    prompt: str
    max_new_tokens: int = Field(default=400, ge=1, le=2048)
    temperature: float = Field(default=0.6, ge=0.1, le=2.0)
    top_p: float = Field(default=0.85, ge=0.0, le=1.0)
    repetition_penalty: float = Field(default=1.05, ge=1.0, le=2.0)
    system_prompt: Optional[str] = Field(
        default="Ты — эксперт по оценке компетенций. Отвечай кратко и по делу."
    )
    chat_template: bool = Field(default=True)  # использовать chat template или нет


class GenerationResponse(BaseModel):
    text: str
    success: bool
    error: Optional[str] = None
    generation_time_ms: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    model_size: Optional[str] = None


# Глобальные переменные для модели
model = None
tokenizer = None
model_device = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting ML service...")
    await load_model()
    yield
    # Shutdown
    logger.info("Shutting down ML service...")


app = FastAPI(title="Qwen Inference Service", lifespan=lifespan)


async def load_model():
    """Асинхронная загрузка модели"""
    global model, tokenizer, model_device
    
    try:
        logger.info(f"Loading model from {MODEL_PATH}")
        
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model path does not exist: {MODEL_PATH}")
        
        # Определяем устройство
        device = DEVICE_CUDA if torch.cuda.is_available() else DEVICE_CPU
        model_device = device
        logger.info(f"Using device: {device}")
        
        # Загружаем токенизатор
        tokenizer = AutoTokenizer.from_pretrained(
            MODEL_PATH, 
            trust_remote_code=True, 
            local_files_only=True
        )
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        # Загружаем модель
        load_kwargs = {
            "trust_remote_code": True,
            "local_files_only": True,
        }
        
        if device == DEVICE_CUDA:
            load_kwargs["device_map"] = "auto"
            load_kwargs["torch_dtype"] = torch.float16
        else:
            load_kwargs["device_map"] = device
        
        model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, **load_kwargs)
        model.eval()
        
        logger.info("Model loaded successfully")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        model = None
        tokenizer = None
        raise


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Проверка здоровья сервиса"""
    return HealthResponse(
        status="healthy" if model is not None else "unhealthy",
        model_loaded=model is not None,
        device=model_device or "unknown",
        model_size=None  # можно добавить определение размера
    )


@app.post("/generate", response_model=GenerationResponse)
async def generate(request: GenerationRequest):
    """Генерация текста моделью"""
    import time
    
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    try:
        # Форматируем промпт с chat template если нужно
        if request.chat_template:
            messages = [
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.prompt}
            ]
            text = tokenizer.apply_chat_template(
                messages, 
                tokenize=False, 
                add_generation_prompt=True
            )
        else:
            text = request.prompt
        
        # Токенизация
        inputs = tokenizer(
            text, 
            return_tensors="pt", 
            truncation=True, 
            max_length=1024
        ).to(model.device)
        
        # Генерация
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=request.max_new_tokens,
                do_sample=True,
                temperature=request.temperature,
                top_p=request.top_p,
                repetition_penalty=request.repetition_penalty,
                pad_token_id=tokenizer.eos_token_id,
            )
        
        # Декодирование
        generated = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Извлекаем ответ ассистента если использовали chat template
        if request.chat_template:
            response = generated.split("<|im_start|>assistant\n")[-1].strip()
        else:
            response = generated.strip()
        
        generation_time = (time.time() - start_time) * 1000
        
        return GenerationResponse(
            text=response,
            success=True,
            generation_time_ms=generation_time
        )
        
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return GenerationResponse(
            text="",
            success=False,
            error=str(e)
        )


@app.post("/generate_batch")
async def generate_batch(requests: List[GenerationRequest]):
    """Пакетная генерация (опционально)"""
    import asyncio
    tasks = [generate(req) for req in requests]
    results = await asyncio.gather(*tasks)
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
